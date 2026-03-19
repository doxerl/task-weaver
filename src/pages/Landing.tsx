import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ScanLine,
  Landmark,
  FileBarChart,
  Activity,
  TrendingUp,
  GitCompareArrows,
  PiggyBank,
  Presentation,
  Upload,
  BrainCircuit,
  Download,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function Landing() {
  const { user, loading } = useAuthContext();
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/finance" replace />;
  }

  const features = [
    {
      icon: ScanLine,
      title: t('landing.features.ai.title'),
      items: [t('landing.features.ai.ocr'), t('landing.features.ai.bank')],
      gradient: 'from-chart-1/10 to-chart-1/5',
      iconColor: 'text-[hsl(var(--chart-1))]',
    },
    {
      icon: FileBarChart,
      title: t('landing.features.reporting.title'),
      items: [t('landing.features.reporting.official'), t('landing.features.reporting.realtime')],
      gradient: 'from-chart-2/10 to-chart-2/5',
      iconColor: 'text-[hsl(var(--chart-2))]',
    },
    {
      icon: TrendingUp,
      title: t('landing.features.simulation.title'),
      items: [t('landing.features.simulation.model'), t('landing.features.simulation.compare')],
      gradient: 'from-chart-3/10 to-chart-3/5',
      iconColor: 'text-[hsl(var(--chart-3))]',
    },
    {
      icon: PiggyBank,
      title: t('landing.features.investor.title'),
      items: [t('landing.features.investor.capital'), t('landing.features.investor.pitch')],
      gradient: 'from-chart-4/10 to-chart-4/5',
      iconColor: 'text-[hsl(var(--chart-4))]',
    },
  ];

  const steps = [
    { num: 1, icon: Upload, title: t('landing.steps.upload.title'), desc: t('landing.steps.upload.desc') },
    { num: 2, icon: BrainCircuit, title: t('landing.steps.scenario.title'), desc: t('landing.steps.scenario.desc') },
    { num: 3, icon: Download, title: t('landing.steps.output.title'), desc: t('landing.steps.output.desc') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-primary">PlannerDeck</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
              {t('landing.nav.login')}
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              {t('landing.nav.tryFree')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t('landing.hero.title')}
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/auth')}>
                {t('landing.hero.cta')} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('landing.hero.ctaSecondary')}
              </Button>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="hidden md:block">
            <div className="rounded-xl border bg-card p-4 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-3))]/60" />
                <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-2))]/60" />
                <span className="ml-2 text-xs text-muted-foreground">PlannerDeck</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('landing.mock.revenue'), value: '₺847K', color: 'bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]' },
                  { label: t('landing.mock.expenses'), value: '₺523K', color: 'bg-[hsl(var(--chart-5))]/15 text-[hsl(var(--chart-5))]' },
                  { label: t('landing.mock.profit'), value: '₺324K', color: 'bg-[hsl(var(--chart-1))]/15 text-[hsl(var(--chart-1))]' },
                ].map((m) => (
                  <div key={m.label} className={`rounded-lg p-3 ${m.color}`}>
                    <p className="text-[10px] opacity-70">{m.label}</p>
                    <p className="text-lg font-bold">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-end gap-1">
                {[40, 55, 35, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/20"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t('landing.features.heading')}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            {t('landing.features.subheading')}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="border bg-gradient-to-b transition-shadow hover:shadow-md">
                <CardContent className="p-6 space-y-3">
                  <div className={`inline-flex rounded-lg p-2.5 bg-gradient-to-br ${f.gradient}`}>
                    <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {f.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t('landing.howItWorks.heading')}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex flex-col items-center text-center">
                {i < steps.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-border md:block" />
                )}
                <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('landing.howItWorks.step', { num: s.num })}
                </span>
                <h3 className="mb-1 font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              {t('landing.hero.cta')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <span className="text-lg font-bold text-primary">PlannerDeck</span>
              <p className="mt-1 text-xs text-muted-foreground">{t('landing.footer.company')}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">
                {t('landing.nav.login')}
              </button>
              <span className="text-border">|</span>
              <span>{t('landing.footer.privacy')}</span>
              <span className="text-border">|</span>
              <span>{t('landing.footer.terms')}</span>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} PlannerDeck. {t('landing.footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
