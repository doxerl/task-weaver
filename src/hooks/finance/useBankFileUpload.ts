import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { useBankImportSession, SaveTransactionParams, SaveCategorizationParams } from './useBankImportSession';
import { parseFile } from '@/lib/fileParser';
import { ParsedTransaction, ParseResult, ParseSummary, BankInfo, CategorizationResult, BalanceImpact, TransactionCategory, FailedBatch } from '@/types/finance';
import { EditableTransaction } from '@/components/finance/TransactionEditor';
import { categorizeWithRules, RuleMatchResult } from './useCategoryRules';

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'categorizing' | 'saving' | 'completed' | 'error' | 'cancelled' | 'paused';

export interface BatchProgress {
  current: number;
  total: number;
  processedTransactions: number;
  totalTransactions: number;
  estimatedTimeLeft: number;
  stage: 'parsing' | 'categorizing';
  // Extended tracking fields
  totalRowsInFile: number;         // Total rows in Excel file
  expectedTransactions: number;    // Expected transaction count (excluding header)
  successfulBatches: number;       // Successfully processed batches
  failedBatches: number;           // Permanently failed batches
  retriedBatches: number;          // Batches that succeeded after retry
  currentRetryAttempt: number;     // Current retry attempt (0 = first attempt)
  parallelCount: number;           // Parallel processing count
  lastBatchDuration: number;       // Duration of last batch (ms)
}

export interface ResumeState {
  batches: string[];
  currentIndex: number;
  ext: string;
  fileName: string;
  collectedTransactions: ParsedTransaction[];
  failedBatches: FailedBatch[];
  totalRowsInFile: number;
}

const PARSE_BATCH_SIZE = 10; // 10 satır per parse batch
const PARALLEL_BATCH_COUNT = 20; // 20 batch aynı anda işlenecek (parse & categorize)
const CATEGORIZE_BATCH_SIZE = 25;
const ESTIMATED_SECONDS_PER_PARSE_BATCH = 5; // Paralel işleme ile daha hızlı
const ESTIMATED_SECONDS_PER_CATEGORIZE_GROUP = 4; // Paralel gruplar için
const MAX_BATCH_RETRIES = 3; // Maximum retry count for failed batches
const RETRY_DELAY_BASE_MS = 2000; // Base delay for exponential backoff

// Hash function for file content
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

export function useBankFileUpload() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  
  // Bank import session hook for persistence
  const bankImportSession = useBankImportSession();
  
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    current: 0,
    total: 0,
    processedTransactions: 0,
    totalTransactions: 0,
    estimatedTimeLeft: 0,
    stage: 'parsing',
    totalRowsInFile: 0,
    expectedTransactions: 0,
    successfulBatches: 0,
    failedBatches: 0,
    retriedBatches: 0,
    currentRetryAttempt: 0,
    parallelCount: PARALLEL_BATCH_COUNT,
    lastBatchDuration: 0,
  });
  const [canResume, setCanResume] = useState(false);
  const [pausedTransactionCount, setPausedTransactionCount] = useState(0);
  const [failedRowRanges, setFailedRowRanges] = useState<FailedBatch[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<boolean>(false);
  const resumeStateRef = useRef<ResumeState | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const stopProcessing = useCallback(() => {
    console.log('Stop processing called, setting abortRef to true');
    abortRef.current = true;
    clearProgressInterval();
    // Don't set status here - let processBatches handle it after PAUSED error
    // pausedTransactionCount will be set when status becomes 'paused'
  }, [clearProgressInterval]);

  const reset = useCallback(() => {
    abortRef.current = false;
    clearProgressInterval();
    setProgress(0);
    setStatus('idle');
    setParsedTransactions([]);
    setParseResult(null);
    setCurrentFileId(null);
    setCanResume(false);
    setPausedTransactionCount(0);
    setFailedRowRanges([]);
    resumeStateRef.current = null;
    currentSessionIdRef.current = null;
    setBatchProgress({
      current: 0,
      total: 0,
      processedTransactions: 0,
      totalTransactions: 0,
      estimatedTimeLeft: 0,
      stage: 'parsing',
      totalRowsInFile: 0,
      expectedTransactions: 0,
      successfulBatches: 0,
      failedBatches: 0,
      retriedBatches: 0,
      currentRetryAttempt: 0,
      parallelCount: PARALLEL_BATCH_COUNT,
      lastBatchDuration: 0,
    });
    
    // Cache invalidation
    queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
    queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['activeImportSession'] });
  }, [clearProgressInterval, queryClient]);

  // Process a single batch with retry mechanism
  const processSingleBatch = async (
    batchContent: string,
    batchIndex: number,
    ext: string,
    fileName: string,
    totalBatches: number,
    maxRetries: number = MAX_BATCH_RETRIES,
    onRetryAttempt?: (batchIndex: number, attempt: number) => void
  ): Promise<{ batchIndex: number; transactions: ParsedTransaction[]; summary: ParseSummary | null; bank_info: BankInfo | null; success: boolean; retryCount: number; wasRetried: boolean; error?: string }> => {
    let lastError = '';
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Notify about retry attempt for UI updates
        if (attempt > 0 && onRetryAttempt) {
          onRetryAttempt(batchIndex, attempt);
        }
        
        console.log(`Processing parse batch ${batchIndex + 1}/${totalBatches}${attempt > 0 ? ` (retry ${attempt})` : ''}`);

        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-bank-statement', {
          body: {
            fileContent: batchContent,
            fileType: ext,
            fileName: fileName,
            batchIndex: batchIndex,
            totalBatches: totalBatches
          }
        });

        if (parseError) {
          lastError = parseError.message;
          console.warn(`Batch ${batchIndex + 1} error (attempt ${attempt + 1}):`, parseError.message);
          
          // Retry if we have attempts left
          if (attempt < maxRetries) {
            const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
            console.log(`Retrying batch ${batchIndex + 1} in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return { batchIndex, transactions: [], summary: null, bank_info: null, success: false, retryCount: attempt + 1, wasRetried: attempt > 0, error: lastError };
        }

        if (parseData?.success && parseData?.transactions?.length > 0) {
          // Add offset to index based on batch position
          const offsetTransactions = parseData.transactions.map((t: any, idx: number) => ({
            ...t,
            index: (batchIndex * PARSE_BATCH_SIZE) + idx
          }));
          const duration = Date.now() - startTime;
          console.log(`Batch ${batchIndex + 1}: Got ${parseData.transactions.length} transactions${attempt > 0 ? ` after ${attempt} retries` : ''} (${duration}ms)`);
          return { 
            batchIndex, 
            transactions: offsetTransactions, 
            summary: parseData.summary || null,
            bank_info: parseData.bank_info || null,
            success: true,
            retryCount: attempt,
            wasRetried: attempt > 0
          };
        } else {
          // No transactions returned - might be a parsing issue, retry
          lastError = 'No transactions returned from AI';
          console.warn(`Batch ${batchIndex + 1}: No transactions returned (attempt ${attempt + 1})`);
          
          if (attempt < maxRetries) {
            const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
            console.log(`Retrying batch ${batchIndex + 1} in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return { batchIndex, transactions: [], summary: null, bank_info: null, success: false, retryCount: attempt + 1, wasRetried: attempt > 0, error: lastError };
        }
      } catch (batchErr) {
        lastError = batchErr instanceof Error ? batchErr.message : 'Unknown error';
        console.error(`Batch ${batchIndex + 1} exception (attempt ${attempt + 1}):`, batchErr);
        
        if (attempt < maxRetries) {
          const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
          console.log(`Retrying batch ${batchIndex + 1} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return { batchIndex, transactions: [], summary: null, bank_info: null, success: false, retryCount: attempt + 1, wasRetried: attempt > 0, error: lastError };
      }
    }
    
    // Should not reach here, but return failure just in case
    return { batchIndex, transactions: [], summary: null, bank_info: null, success: false, retryCount: maxRetries + 1, wasRetried: true, error: lastError };
  };

  // Process batches from a starting index with parallel execution and retry mechanism
  const processBatches = async (
    batches: string[],
    startIndex: number,
    ext: string,
    fileName: string,
    existingTransactions: ParsedTransaction[],
    existingFailedBatches: FailedBatch[] = [],
    totalRowsInFile: number = 0
  ): Promise<{ transactions: ParsedTransaction[]; failedBatches: FailedBatch[] }> => {
    const totalParseBatches = batches.length;
    const transactionMap: Map<number, ParsedTransaction[]> = new Map();
    const failedBatchList: FailedBatch[] = [...existingFailedBatches];
    let completedBatches = startIndex;
    let successfulBatchCount = 0;
    let retriedBatchCount = 0;
    let lastBatchDuration = 0;

    // Add existing transactions to map
    existingTransactions.forEach(t => {
      const batchIdx = Math.floor(t.index / PARSE_BATCH_SIZE);
      if (!transactionMap.has(batchIdx)) {
        transactionMap.set(batchIdx, []);
      }
      transactionMap.get(batchIdx)!.push(t);
    });

    // Count existing successful batches
    const existingSuccessfulBatches = new Set(existingTransactions.map(t => Math.floor(t.index / PARSE_BATCH_SIZE))).size;
    successfulBatchCount = existingSuccessfulBatches;

    // Calculate expected transactions (total rows minus header)
    const expectedTransactions = totalRowsInFile > 0 ? totalRowsInFile - 1 : totalParseBatches * PARSE_BATCH_SIZE;

    // Initialize batch progress for parsing with extended info
    setBatchProgress({
      current: startIndex,
      total: totalParseBatches,
      processedTransactions: existingTransactions.length,
      totalTransactions: expectedTransactions,
      estimatedTimeLeft: Math.ceil((totalParseBatches - startIndex) / PARALLEL_BATCH_COUNT) * ESTIMATED_SECONDS_PER_PARSE_BATCH,
      stage: 'parsing',
      totalRowsInFile: totalRowsInFile,
      expectedTransactions: expectedTransactions,
      successfulBatches: successfulBatchCount,
      failedBatches: existingFailedBatches.length,
      retriedBatches: retriedBatchCount,
      currentRetryAttempt: 0,
      parallelCount: PARALLEL_BATCH_COUNT,
      lastBatchDuration: 0,
    });

    // Callback for retry attempts - update UI
    const handleRetryAttempt = (batchIndex: number, attempt: number) => {
      setBatchProgress(prev => ({
        ...prev,
        currentRetryAttempt: attempt,
      }));
    };

    // Process batches in parallel groups
    for (let i = startIndex; i < batches.length; i += PARALLEL_BATCH_COUNT) {
      // Check if processing was stopped
      if (abortRef.current) {
        console.log('Processing stopped by user at batch group starting', i + 1);
        // Save state for resume
        const collectedTransactions = Array.from(transactionMap.values()).flat().sort((a, b) => a.index - b.index);
        resumeStateRef.current = {
          batches,
          currentIndex: i,
          ext,
          fileName,
          collectedTransactions,
          failedBatches: failedBatchList,
          totalRowsInFile: totalRowsInFile,
        };
        setCanResume(true);
        setPausedTransactionCount(collectedTransactions.length);
        setStatus('paused');
        console.log(`Saved resume state: batch ${i}, collected ${collectedTransactions.length} transactions, ${failedBatchList.length} failed batches`);
        break;
      }

      // Get the batch indices for this parallel group
      const parallelIndices: number[] = [];
      for (let j = 0; j < PARALLEL_BATCH_COUNT && (i + j) < batches.length; j++) {
        parallelIndices.push(i + j);
      }

      console.log(`Processing parallel batch group: ${parallelIndices.map(idx => idx + 1).join(', ')} / ${totalParseBatches}`);

      // Update progress before each parallel group
      const currentTransactionCount = Array.from(transactionMap.values()).flat().length;
      setBatchProgress(prev => ({
        ...prev,
        current: i,
        processedTransactions: currentTransactionCount,
        estimatedTimeLeft: Math.max(0, Math.ceil((totalParseBatches - i) / PARALLEL_BATCH_COUNT) * ESTIMATED_SECONDS_PER_PARSE_BATCH),
        stage: 'parsing',
        currentRetryAttempt: 0, // Reset retry indicator at start of each group
      }));

      // Process batches in parallel with retry callback
      const groupStartTime = Date.now();
      const parallelPromises = parallelIndices.map(batchIdx => 
        processSingleBatch(batches[batchIdx], batchIdx, ext, fileName, totalParseBatches, MAX_BATCH_RETRIES, handleRetryAttempt)
      );

      const results = await Promise.all(parallelPromises);
      lastBatchDuration = Date.now() - groupStartTime;

      // Collect results
      for (const result of results) {
        if (result.success && result.transactions.length > 0) {
          transactionMap.set(result.batchIndex, result.transactions);
          successfulBatchCount++;
          
          // Track if this batch was retried successfully
          if (result.wasRetried) {
            retriedBatchCount++;
            console.log(`✅ Batch ${result.batchIndex + 1} succeeded after ${result.retryCount} retries`);
          }
        } else {
          // Track failed batch with row range
          const rowStart = result.batchIndex * PARSE_BATCH_SIZE + 2; // +2 for header offset (Excel row 1 = header)
          const rowEnd = Math.min((result.batchIndex + 1) * PARSE_BATCH_SIZE + 1, totalParseBatches * PARSE_BATCH_SIZE + 1);
          
          failedBatchList.push({
            batchIndex: result.batchIndex,
            rowRange: { start: rowStart, end: rowEnd },
            error: result.error || 'Unknown error after 3 retries',
            retryCount: result.retryCount
          });
          
          console.warn(`⚠️ Batch ${result.batchIndex + 1} failed permanently: rows ${rowStart}-${rowEnd}`);
        }
        completedBatches++;
      }

      // Update progress with all stats after each group
      const updatedTransactionCount = Array.from(transactionMap.values()).flat().length;
      setBatchProgress(prev => ({
        ...prev,
        current: completedBatches,
        processedTransactions: updatedTransactionCount,
        successfulBatches: successfulBatchCount,
        failedBatches: failedBatchList.length,
        retriedBatches: retriedBatchCount,
        currentRetryAttempt: 0,
        lastBatchDuration: lastBatchDuration,
        estimatedTimeLeft: Math.max(0, Math.ceil((totalParseBatches - completedBatches) / PARALLEL_BATCH_COUNT) * ESTIMATED_SECONDS_PER_PARSE_BATCH),
      }));

      // Update overall progress
      const parseProgress = 30 + (completedBatches / totalParseBatches) * 35;
      setProgress(parseProgress);
    }

    // Flatten and sort all transactions by index
    const allTransactions = Array.from(transactionMap.values())
      .flat()
      .sort((a, b) => a.index - b.index);

    // Update failed row ranges state for UI
    setFailedRowRanges(failedBatchList);

    // Final batch progress update
    setBatchProgress(prev => ({
      ...prev,
      current: abortRef.current ? prev.current : totalParseBatches,
      processedTransactions: allTransactions.length,
      estimatedTimeLeft: 0,
      stage: 'parsing',
      successfulBatches: successfulBatchCount,
      failedBatches: failedBatchList.length,
      retriedBatches: retriedBatchCount,
      currentRetryAttempt: 0,
    }));

    // If stopped by user
    if (abortRef.current) {
      if (allTransactions.length > 0) {
        console.log(`Processing paused with ${allTransactions.length} transactions collected, ${failedBatchList.length} failed batches`);
      }
      throw new Error('PAUSED');
    }

    // Log final summary
    if (failedBatchList.length > 0) {
      console.warn(`⚠️ Parsing complete with ${failedBatchList.length} failed batches:`);
      failedBatchList.forEach(fb => {
        console.warn(`  - Batch ${fb.batchIndex + 1}: rows ${fb.rowRange.start}-${fb.rowRange.end} (${fb.error})`);
      });
    }

    if (retriedBatchCount > 0) {
      console.log(`🔄 ${retriedBatchCount} batches succeeded after retry`);
    }

    console.log(`Parsing complete: ${allTransactions.length} transactions from ${successfulBatchCount}/${totalParseBatches} batches (${PARALLEL_BATCH_COUNT}x parallel)`);
    return { transactions: allTransactions, failedBatches: failedBatchList };
  };

  // Categorize transactions using hybrid approach: Rules -> Keywords -> AI
  const categorizeTransactions = async (parsed: ParsedTransaction[]): Promise<ParsedTransaction[]> => {
    if (!user?.id) {
      console.warn('No user ID, skipping categorization');
      return parsed;
    }

    // CRITICAL: Fetch fresh categories sorted by match_priority
    const { data: freshCategories } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('is_active', true)
      .order('match_priority', { ascending: true });
    
    const categoryList = (freshCategories || []) as TransactionCategory[];
    console.log('Fresh categories loaded (sorted by match_priority):', categoryList.length);

    // STAGE 1 & 2: Rule and Keyword matching (client-side, instant)
    console.log('🔍 Starting rule/keyword matching...');
    const { matched, needsAI } = await categorizeWithRules(parsed, user.id, categoryList);
    
    console.log(`✅ Rule/Keyword matched: ${matched.length}/${parsed.length}`);
    console.log(`🤖 Sending to AI: ${needsAI.length}/${parsed.length}`);

    // Apply matched results to transactions
    const categorizedFromRules = parsed.map((tx) => {
      const match = matched.find(m => m.transactionIndex === tx.index);
      if (match) {
        return {
          ...tx,
          suggestedCategoryId: match.categoryId,
          aiConfidence: match.confidence,
          aiCategoryCode: match.categoryCode,
          aiReasoning: `[${match.source}] ${match.reasoning}`,
          affectsPnl: match.affectsPnl,
          balanceImpact: match.balanceImpact as BalanceImpact,
          counterparty: match.counterparty || tx.counterparty
        };
      }
      return tx;
    });

    // If no transactions need AI, return early
    if (needsAI.length === 0) {
      console.log('✨ All transactions matched by rules/keywords, skipping AI call');
      setBatchProgress(prev => ({
        ...prev,
        current: 1,
        total: 1,
        processedTransactions: parsed.length,
        totalTransactions: parsed.length,
        estimatedTimeLeft: 0,
        stage: 'categorizing',
      }));
      return categorizedFromRules;
    }

    // STAGE 3: AI categorization for unmatched transactions
    const totalCatBatches = Math.ceil(needsAI.length / CATEGORIZE_BATCH_SIZE);
    const totalParallelGroups = Math.ceil(totalCatBatches / PARALLEL_BATCH_COUNT);

    // Initialize batch progress for categorization
    setBatchProgress(prev => ({
      ...prev,
      current: 0,
      total: totalCatBatches,
      processedTransactions: matched.length,
      totalTransactions: parsed.length,
      estimatedTimeLeft: totalParallelGroups * ESTIMATED_SECONDS_PER_CATEGORIZE_GROUP,
      stage: 'categorizing',
    }));

    // Start simulated progress interval for categorization
    let simulatedGroup = 0;
    clearProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      simulatedGroup += 1;
      const simulatedBatch = Math.min(simulatedGroup * PARALLEL_BATCH_COUNT, totalCatBatches);
      if (simulatedGroup >= totalParallelGroups) {
        clearProgressInterval();
      }
      setBatchProgress(prev => ({
        ...prev,
        current: simulatedBatch,
        processedTransactions: matched.length + Math.min(simulatedBatch * CATEGORIZE_BATCH_SIZE, needsAI.length),
        estimatedTimeLeft: Math.max(0, (totalParallelGroups - simulatedGroup) * ESTIMATED_SECONDS_PER_CATEGORIZE_GROUP),
        stage: 'categorizing',
      }));
    }, ESTIMATED_SECONDS_PER_CATEGORIZE_GROUP * 1000);

    try {
      // Only send unmatched transactions to AI
      const { data: catData, error: catError } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: needsAI, categories: categoryList }
      });

      // Kategorilendirme tamamlandı
      clearProgressInterval();
      setBatchProgress(prev => ({
        ...prev,
        current: prev.total,
        processedTransactions: parsed.length,
        estimatedTimeLeft: 0,
        stage: 'categorizing',
      }));

      if (!catError && catData?.results) {
        console.log(`🤖 AI categorized ${catData.results.length} transactions`);

        // Create a map of AI results by original index
        const aiResultsMap = new Map<number, CategorizationResult>();
        catData.results.forEach((r: CategorizationResult) => {
          aiResultsMap.set(r.index, r);
        });

        // Merge AI results with rule-matched results
        const finalCategorized = categorizedFromRules.map((tx) => {
          // Skip if already matched by rules/keywords
          if (matched.some(m => m.transactionIndex === tx.index)) {
            return tx;
          }

          // Find AI result for this transaction
          const aiResult = aiResultsMap.get(tx.index);
          if (aiResult) {
            const cat = categoryList.find(c => c.code === aiResult.categoryCode);
            console.log(`TX ${tx.index}: AI=${aiResult.categoryCode}, Match=${cat?.code || 'NOT FOUND'}`);
            return {
              ...tx,
              suggestedCategoryId: cat?.id || null,
              aiConfidence: aiResult.confidence || 0,
              aiCategoryCode: aiResult.categoryCode,
              aiReasoning: `[ai] ${aiResult.reasoning || ''}`,
              affectsPnl: aiResult.affects_pnl,
              balanceImpact: aiResult.balance_impact as BalanceImpact,
              counterparty: aiResult.counterparty || tx.counterparty
            };
          }
          return tx;
        });

        // Save all categorization results to DB if we have an active session
        if (currentSessionIdRef.current) {
          try {
            // Combine rule matches and AI results for DB save
            const allCategorizationResults: SaveCategorizationParams[] = [
              // Rule/Keyword matches
              ...matched.map(m => {
                const tx = parsed.find(t => t.index === m.transactionIndex);
                return {
                  row_number: tx?.row_number || m.transactionIndex + 1,
                  category_code: m.categoryCode,
                  category_type: m.categoryType,
                  confidence: m.confidence,
                  reasoning: `[${m.source}] ${m.reasoning}`,
                  counterparty: m.counterparty || null,
                  affects_pnl: m.affectsPnl,
                  balance_impact: m.balanceImpact
                };
              }),
              // AI results
              ...catData.results.map((r: CategorizationResult) => ({
                row_number: needsAI.find(t => t.index === r.index)?.row_number || r.index + 1,
                category_code: r.categoryCode,
                category_type: r.categoryType,
                confidence: r.confidence,
                reasoning: `[ai] ${r.reasoning || ''}`,
                counterparty: r.counterparty,
                affects_pnl: r.affects_pnl,
                balance_impact: r.balance_impact
              }))
            ];
            await bankImportSession.saveCategorizations(allCategorizationResults);
            console.log('All categorization results saved to DB');
          } catch (saveErr) {
            console.warn('Failed to save categorizations to DB:', saveErr);
          }
        }

        return finalCategorized;
      } else {
        console.warn('AI kategorilendirme atlandı:', catError?.message);
        return categorizedFromRules;
      }
    } catch (catErr) {
      clearProgressInterval();
      console.warn('AI kategorilendirme hatası:', catErr);
      return categorizedFromRules;
    }
  };

  // Resume processing from where it stopped
  const resumeProcessing = useMutation({
    mutationFn: async (): Promise<ParsedTransaction[]> => {
      const resumeState = resumeStateRef.current;
      if (!resumeState) {
        throw new Error('Devam edilecek işlem bulunamadı');
      }

      const { batches, currentIndex, ext, fileName, collectedTransactions, failedBatches: existingFailedBatches, totalRowsInFile } = resumeState;
      
      // CRITICAL: Reset abort flag BEFORE setting status
      abortRef.current = false;
      setCanResume(false);
      setStatus('parsing');
      
      console.log(`Resuming from batch ${currentIndex + 1}/${batches.length}, collected: ${collectedTransactions.length}`);

      try {
        const result = await processBatches(
          batches,
          currentIndex,
          ext,
          fileName,
          collectedTransactions,
          existingFailedBatches,
          totalRowsInFile
        );

        if (result.transactions.length === 0) {
          throw new Error('Dosyadan işlem çıkarılamadı.');
        }

        setProgress(65);
        setStatus('categorizing');

        const categorized = await categorizeTransactions(result.transactions);

        setProgress(85);
        setParsedTransactions(categorized);
        resumeStateRef.current = null;

        return categorized;
      } catch (error) {
        if (error instanceof Error && error.message === 'PAUSED') {
          // User paused again - return current collected transactions
          const currentCollected = resumeStateRef.current?.collectedTransactions || collectedTransactions;
          return currentCollected;
        }
        clearProgressInterval();
        setStatus('error');
        throw error;
      }
    },
    onSuccess: (result) => {
      // Only go to preview if we have results and not paused
      if (result.length > 0 && status !== 'paused') {
        console.log(`Resume completed with ${result.length} transactions`);
      }
    },
    onError: (error: Error) => {
      if (error.message !== 'PAUSED') {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  });

  // Step 1: Upload file and parse with AI (returns transactions for preview)
  const uploadAndParse = useMutation({
    mutationFn: async (file: File): Promise<ParsedTransaction[]> => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      
      // Validate file type - only Excel allowed
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        throw new Error('PDF formatı desteklenmiyor. Lütfen Excel (.xlsx veya .xls) dosyası yükleyin.');
      }
      if (!['xlsx', 'xls'].includes(ext || '')) {
        throw new Error('Desteklenmeyen dosya formatı. Lütfen Excel (.xlsx veya .xls) dosyası yükleyin.');
      }
      
      abortRef.current = false;
      setCanResume(false);
      resumeStateRef.current = null;
      currentSessionIdRef.current = null;
      setCanResume(false);
      resumeStateRef.current = null;

      try {
        setStatus('uploading');
        setProgress(5);

        // Compute file hash for duplicate detection
        const fileHash = await computeFileHash(file);
        console.log('File hash:', fileHash);

        // Create import session first
        try {
          const sessionResult = await bankImportSession.createSession({
            fileName: file.name,
            fileHash
          });
          currentSessionIdRef.current = sessionResult.id;
          
          // If existing session found, load transactions from DB
          if (sessionResult.isExisting && sessionResult.status === 'review') {
            await bankImportSession.refetchTransactions();
            const existingTransactions = bankImportSession.parsedTransactions;
            if (existingTransactions.length > 0) {
              setParsedTransactions(existingTransactions);
              setProgress(100);
              return existingTransactions;
            }
          }
        } catch (sessionErr) {
          console.warn('Session creation failed, continuing without persistence:', sessionErr);
        }

        // Check for existing file with same name in bank_files
        const { data: existingFile } = await supabase
          .from('uploaded_bank_files')
          .select('id, file_name, processing_status')
          .eq('user_id', user.id)
          .eq('file_name', file.name)
          .eq('processing_status', 'completed')
          .maybeSingle();

        if (existingFile) {
          const confirmReupload = window.confirm(
            `"${file.name}" daha önce yüklenmiş. Mevcut verileri silip yeniden yüklemek ister misiniz?`
          );
          if (!confirmReupload) {
            throw new Error('Yükleme iptal edildi');
          }
          // Delete existing data
          await supabase.from('bank_transactions').delete().eq('file_id', existingFile.id);
          await supabase.from('uploaded_bank_files').delete().eq('id', existingFile.id);
        }

        setProgress(10);

        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'xlsx';
        const path = `${user.id}/bank/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('finance-files')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('finance-files')
          .getPublicUrl(path);

        setProgress(20);

        // 2. Create DB record
        const { data: bankFile, error: dbError } = await supabase
          .from('uploaded_bank_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: fileExt,
            file_size: file.size,
            file_url: publicUrl,
            processing_status: 'processing'
          })
          .select()
          .single();

        if (dbError) throw dbError;
        setCurrentFileId(bankFile.id);
        setProgress(25);

        // 3. Read file content (parse XLSX/PDF to text)
        const fileContent = await parseFile(file);
        console.log('File content length:', fileContent.length);

        // 4. Split into batches (10 lines each)
        setStatus('parsing');
        setProgress(30);

        const lines = fileContent.split('\n').filter(line => line.trim());
        const headerLine = lines[0] || '';
        const dataLines = lines.slice(1);
        const totalRowsInFile = lines.length; // Total including header

        console.log(`Total lines: ${lines.length}, Data lines: ${dataLines.length}`);

        // Create batches of 10 data lines
        const batches: string[] = [];
        for (let i = 0; i < dataLines.length; i += PARSE_BATCH_SIZE) {
          const batchLines = dataLines.slice(i, i + PARSE_BATCH_SIZE);
          batches.push([headerLine, ...batchLines].join('\n'));
        }

        console.log(`Created ${batches.length} parse batches`);

        // 5. Process batches with totalRowsInFile for accurate progress
        const batchResult = await processBatches(batches, 0, fileExt, file.name, [], [], totalRowsInFile);
        const allTransactions = batchResult.transactions;

        if (allTransactions.length === 0) {
          throw new Error('Dosyadan işlem çıkarılamadı. Lütfen farklı bir format deneyin.');
        }

        // Save parsed transactions to DB (before AI categorization)
        if (currentSessionIdRef.current) {
          try {
            const saveParams: SaveTransactionParams[] = allTransactions.map(tx => ({
              row_number: tx.row_number,
              transaction_date: tx.date,
              original_date: tx.original_date,
              description: tx.description,
              amount: tx.amount,
              original_amount: tx.original_amount,
              balance: tx.balance,
              reference: tx.reference,
              counterparty: tx.counterparty,
              transaction_type: tx.transaction_type,
              channel: tx.channel
            }));
            await bankImportSession.saveTransactions(saveParams);
            console.log('Parsed transactions saved to DB');
          } catch (saveErr) {
            console.warn('Failed to save transactions to DB:', saveErr);
          }
        }

        // Calculate summary from transactions - include failed batch info
        const expectedRows = dataLines.length;
        const actualRows = allTransactions.length;
        const missingRows = expectedRows - actualRows;

        const calculatedSummary: ParseSummary = {
          total_rows_in_file: expectedRows,
          header_rows_skipped: 1,
          footer_rows_skipped: 0,
          empty_rows_skipped: missingRows > 0 ? missingRows : 0,
          transaction_count: allTransactions.length,
          needs_review_count: allTransactions.filter(t => t.needs_review).length,
          total_income: allTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
          total_expense: allTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
          date_range: {
            start: allTransactions[0]?.date || '',
            end: allTransactions[allTransactions.length - 1]?.date || ''
          }
        };

        const bankInfo: BankInfo = {
          detected_bank: null,
          account_number: null,
          iban: null,
          currency: 'TRY'
        };

        // Set parse result
        setParseResult({
          transactions: allTransactions,
          summary: calculatedSummary,
          bank_info: bankInfo
        });

        setProgress(65);

        // Step 6: AI Kategorilendirme
        setStatus('categorizing');

        const categorized = await categorizeTransactions(allTransactions);

        // Update parse result with categorized transactions
        setParseResult(prev => prev ? {
          ...prev,
          transactions: categorized
        } : null);

        setProgress(85);
        setParsedTransactions(categorized);

        return categorized;
      } catch (error) {
        if (error instanceof Error && error.message === 'PAUSED') {
          // User paused, don't throw error
          return [];
        }
        clearProgressInterval();
        setStatus('error');
        throw error;
      }
    },
    onError: (error: Error) => {
      if (error.message !== 'PAUSED') {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  });

  // Step 2: Save categorized transactions
  const saveTransactions = useMutation({
    mutationFn: async (transactions: EditableTransaction[]) => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      if (!currentFileId) throw new Error('Dosya ID bulunamadı');

      setStatus('saving');
      setProgress(85);

      // Filter only categorized transactions
      const categorizedTx = transactions.filter(t => t.categoryId);

      if (categorizedTx.length === 0) {
        throw new Error('En az bir işlem kategorize edilmeli');
      }

      // Parse transactions and check for duplicates
      const parsedItems = categorizedTx.map((t) => {
        // Parse Turkish date format DD.MM.YYYY
        let transactionDate = t.date;
        if (t.date && t.date.includes('.')) {
          const parts = t.date.split('.');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const year = y.length === 2 ? `20${y}` : y;
            transactionDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }
        return { ...t, parsedDate: transactionDate };
      });

      // Get existing transactions for duplicate check
      const dates = parsedItems.map(t => t.parsedDate).filter(Boolean);
      const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
      const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;

      let existingSet = new Set<string>();
      if (minDate && maxDate) {
        const { data: existingTxs } = await supabase
          .from('bank_transactions')
          .select('transaction_date, description, amount')
          .eq('user_id', user.id)
          .gte('transaction_date', minDate)
          .lte('transaction_date', maxDate);

        existingSet = new Set(
          (existingTxs || []).map(t => 
            `${t.transaction_date}|${t.description}|${t.amount}`
          )
        );
      }

      // Filter out duplicates
      const uniqueItems = parsedItems.filter(t => 
        !existingSet.has(`${t.parsedDate}|${t.description}|${t.amount}`)
      );

      const skippedCount = parsedItems.length - uniqueItems.length;
      if (skippedCount > 0) {
        toast({
          title: 'Bilgi',
          description: `${skippedCount} duplicate işlem atlandı`
        });
      }

      if (uniqueItems.length === 0) {
        throw new Error('Tüm işlemler zaten kayıtlı');
      }

      // Get category info for VAT separation
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      // VAT separation logic - categories that don't have VAT
      const noVatTypes = ['PARTNER', 'FINANCING', 'EXCLUDED'];
      const noVatCodes = ['FAIZ_IN', 'FAIZ_OUT', 'VERGI', 'SSK', 'BANKA_MASRAF', 'KREDI', 'KREDI_IN', 'KREDI_OUT', 'LEASING', 'FAKTORING'];

      const toInsert = uniqueItems.map((t) => {
        const category = categoryMap.get(t.categoryId || '');
        const isCommercial = category ? 
          !noVatTypes.includes(category.type) && !noVatCodes.includes(category.code) : 
          true;
        
        // Calculate VAT separation for commercial transactions
        const grossAmount = Math.abs(t.amount);
        const netAmount = isCommercial ? grossAmount / 1.20 : grossAmount;
        const vatAmount = isCommercial ? grossAmount - netAmount : 0;
        const vatRate = isCommercial ? 20 : 0;
        
        return {
          file_id: currentFileId,
          user_id: user.id,
          row_number: t.index + 1,
          raw_date: t.date,
          raw_description: t.description,
          raw_amount: String(t.amount),
          transaction_date: t.parsedDate,
          description: t.description,
          amount: t.amount,
          balance: t.balance || null,
          counterparty: t.counterparty || null,
          reference_no: t.reference || null,
          category_id: t.categoryId,
          ai_suggested_category_id: null,
          ai_confidence: 0,
          is_income: t.amount > 0,
          is_excluded: false,
          is_manually_categorized: true,
          // VAT separation fields
          net_amount: t.amount > 0 ? netAmount : -netAmount,
          vat_amount: vatAmount,
          vat_rate: vatRate,
          is_commercial: isCommercial
        };
      });

      const { error: insertError } = await supabase
        .from('bank_transactions')
        .insert(toInsert);

      if (insertError) throw insertError;

      // Update file status
      await supabase
        .from('uploaded_bank_files')
        .update({
          processing_status: 'completed',
          total_transactions: toInsert.length
        })
        .eq('id', currentFileId);

      setProgress(100);
      setStatus('completed');

      return { fileId: currentFileId, count: toInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-files'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: 'Başarılı',
        description: `${data.count} işlem kaydedildi`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Categorize and show paused transactions
  const categorizeAndShowPaused = useMutation({
    mutationFn: async (): Promise<ParsedTransaction[]> => {
      const resumeState = resumeStateRef.current;
      if (!resumeState || resumeState.collectedTransactions.length === 0) {
        throw new Error('Kategorilendecek işlem bulunamadı');
      }

      const transactions = resumeState.collectedTransactions;
      console.log(`Categorizing ${transactions.length} paused transactions`);
      
      setStatus('categorizing');
      setProgress(65);

      const categorized = await categorizeTransactions(transactions);

      setProgress(85);
      setParsedTransactions(categorized);
      
      // Clear resume state since we're now showing the transactions
      resumeStateRef.current = null;
      setCanResume(false);
      setPausedTransactionCount(0);

      return categorized;
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    uploadAndParse,
    saveTransactions,
    resumeProcessing,
    categorizeAndShowPaused,
    progress,
    status,
    isUploading: uploadAndParse.isPending,
    isSaving: saveTransactions.isPending,
    isResuming: resumeProcessing.isPending,
    isCategorizing: categorizeAndShowPaused.isPending,
    parsedTransactions,
    parseResult,
    batchProgress,
    canResume,
    pausedTransactionCount,
    failedRowRanges,
    reset,
    stopProcessing
  };
}
