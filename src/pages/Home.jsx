import { useState } from 'react';
import {
  Navigate,
  Link,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Scissors,
  Shield,
  User,
  ArrowLeft,
  Coffee,
  MessageSquare,
  QrCode,
} from 'lucide-react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import LoginForm from '@/components/LoginForm';
import AuthBackdrop from '@/components/AuthBackdrop';

const loginConfig = {
  admin: {
    icon: Shield,
    title: 'Admin Login',
    subtitle: 'Access the front desk dashboard',
  },
  user: {
    icon: User,
    title: 'User Login',
    subtitle: 'Access your stylist workspace',
  },
};

const footer = (
  <div className="space-y-2 text-center">
    <p className="text-sm text-muted-foreground">
      Registration is by invitation only.
    </p>

    <Link
      to="/salon-signup"
      className="block text-sm font-medium text-primary hover:underline"
    >
      Want to start your own salon? Sign up here →
    </Link>
  </div>
);

export default function Home() {
  const {
    isAuthenticated,
    user,
    authChecked,
  } = useAuth();

  const [view, setView] = useState('landing');
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email');

  const rawHash = window.location.hash || '';

  const guestHashMatch = rawHash.match(
    /^#\/(?:guest|guest-menu)(?:\?(.*))?$/i,
  );

  if (
    location.pathname === '/' &&
    guestHashMatch
  ) {
    const queryString = guestHashMatch[1]
      ? `?${guestHashMatch[1]}`
      : '';

    return (
      <Navigate
        to={`/guest${queryString}`}
        replace
      />
    );
  }

  if (
    authChecked &&
    isAuthenticated &&
    user
  ) {
    return (
      <Navigate
        to={
          user.role === 'admin'
            ? '/front-desk'
            : '/stylist'
        }
        replace
      />
    );
  }

  if (emailParam) {
    return (
      <Navigate
        to={`/register?${searchParams.toString()}`}
        replace
      />
    );
  }

  // Keep your existing return (...) below this point.

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <AuthBackdrop />
      <div className="absolute inset-0 bg-background/5" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <div className="flex-1 max-w-4xl mx-auto px-6 pt-20 pb-12 text-center flex flex-col justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-white/25 bg-background/35 shadow-2xl backdrop-blur-3xl mb-6 self-center">
                <Scissors className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Salonflow
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                Seamless communication between your front desk, stylists, and guests. Order drinks, chat in real time, and manage services — all in one place.
              </p>
              <div className="mx-auto rounded-[2rem] border border-white/25 bg-background/30 p-4 shadow-2xl backdrop-blur-3xl flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={() => setView('admin')}>
                  <Shield className="w-5 h-5 mr-2" />Admin Login
                </Button>
                <Button size="lg" variant="outline" onClick={() => setView('user')}>
                  <User className="w-5 h-5 mr-2" />User Login
                </Button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
              <div className="text-center rounded-3xl border border-white/20 bg-background/30 p-6 shadow-xl backdrop-blur-3xl">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <Coffee className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-1">Drink Ordering</h3>
                <p className="text-sm text-muted-foreground">Stylists and guests request drinks that arrive instantly at the front desk.</p>
              </div>
              <div className="text-center rounded-3xl border border-white/20 bg-background/30 p-6 shadow-xl backdrop-blur-3xl">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-1">Real-Time Chat</h3>
                <p className="text-sm text-muted-foreground">Stylists message the front desk directly with updates and requests.</p>
              </div>
              <div className="text-center rounded-3xl border border-white/20 bg-background/30 p-6 shadow-xl backdrop-blur-3xl">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-1">QR Guest Menu</h3>
                <p className="text-sm text-muted-foreground">Guests scan a QR code to browse the menu and request service from their seat.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <div className="max-w-md mx-auto w-full px-6 pt-12 sm:pt-20 pb-12">
              <Button variant="ghost" size="sm" onClick={() => setView('landing')} className="mb-6 -ml-2 min-h-[44px]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {(() => {
                const { icon: Icon, title, subtitle } = loginConfig[view];
                return (
                  <>
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
                        <Icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                      <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
                    </div>
                    <div className="rounded-[2rem] border border-white/25 bg-background/38 p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
                      <LoginForm />
                    </div>
                    <div className="mt-6">{footer}</div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}