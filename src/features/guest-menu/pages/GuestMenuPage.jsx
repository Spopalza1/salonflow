import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MenuBrowser from '@/components/MenuBrowser';
import GuestShell from '@/components/GuestShell';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Scissors,
  Coffee,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Image as UIImage } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { useGuestCustomization } from '@/hooks/useGuestCustomization';
import { useTheme } from '@/hooks/useTheme';

const STORAGE_KEY_PREFIX = 'salonflow_guest';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'destructive',
  },
  preparing: {
    label: 'Preparing',
    variant: 'secondary',
  },
  served: {
    label: 'Served',
    variant: 'default',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
  },
};

function generateSession() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

function GuestView({
  viewKey,
  children,
  className = '',
}) {
  return (
    <motion.div
      key={viewKey}
      initial={{
        opacity: 0,
        y: 18,
        scale: 0.985,
        filter: 'blur(7px)',
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
      }}
      exit={{
        opacity: 0,
        y: -12,
        scale: 0.99,
        filter: 'blur(5px)',
      }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SalonLogo({
  logoUrl,
  height = 32,
  large = false,
}) {
  const calculatedHeight = large ? height * 2 : height;

  if (logoUrl) {
    return (
      <UIImage
        src={logoUrl}
        alt="Salon logo"
        style={{
          height: `${calculatedHeight}px`,
          width: 'auto',
        }}
        className={
          large
            ? 'mx-auto mb-3'
            : 'shrink-0'
        }
        fittingType="fit"
      />
    );
  }

  if (large) {
    return (
      <div
        className="mb-3 inline-flex items-center justify-center rounded-full bg-primary/10"
        style={{
          width: `${calculatedHeight}px`,
          height: `${calculatedHeight}px`,
        }}
      >
        <Scissors
          className="text-primary"
          style={{
            width: `${calculatedHeight * 0.5}px`,
            height: `${calculatedHeight * 0.5}px`,
          }}
        />
      </div>
    );
  }

  return (
    <Scissors
      className="shrink-0 text-primary"
      style={{
        width: `${calculatedHeight * 0.6}px`,
        height: `${calculatedHeight * 0.6}px`,
      }}
    />
  );
}

function getSafeStatus(status) {
  return (
    STATUS_CONFIG[status] ||
    STATUS_CONFIG.pending
  );
}

export default function GuestMenu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Support current HashRouter links as well as older QR links where the
  // salon query was placed before the hash or embedded in the path.
  const salonId = useMemo(() => {
    const keys = ['salon_id', 'salon', 'salonId'];
    const candidates = [searchParams, new URLSearchParams(window.location.search)];
    const hashQuery = window.location.hash.includes('?')
      ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
      : '';
    if (hashQuery) candidates.push(new URLSearchParams(hashQuery));

    for (const params of candidates) {
      for (const key of keys) {
        const value = params.get(key)?.trim();
        if (value) return value;
      }
    }

    const pathMatch = `${window.location.pathname}${location.pathname}`.match(
      /\/(?:guest|guest-menu)\/([^/?#]+)/i,
    );
    return pathMatch ? decodeURIComponent(pathMatch[1]) : '';
  }, [location.pathname, searchParams]);

  // Canonicalize legacy QR URLs so navigation within the guest experience
  // always preserves the correct salon identifier.
  useEffect(() => {
    if (!salonId || searchParams.get('salon_id') === salonId) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('salon_id', salonId);
      next.delete('salon');
      next.delete('salonId');
      return next;
    }, { replace: true });
  }, [salonId, searchParams, setSearchParams]);

  const storageKey = useMemo(() => {
    if (!salonId) {
      return STORAGE_KEY_PREFIX;
    }

    return `${STORAGE_KEY_PREFIX}_${salonId}`;
  }, [salonId]);

  const view =
    searchParams.get('view') || 'choice';

  const [guestInfo, setGuestInfo] =
    useState(null);

  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [messageText, setMessageText] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [messageSent, setMessageSent] =
    useState(false);

  const [orders, setOrders] =
    useState([]);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [showOrders, setShowOrders] =
    useState(false);

  const [salonName, setSalonName] =
    useState('SalonFlow');

  const { toast } = useToast();

  useTheme();

  const settings =
    useGuestCustomization(salonId);

  const displayName =
    settings.salon_display_name ||
    salonName;

  const logoUrl =
    settings.salon_logo_url;

  const bgImage =
    settings.menu_background_image;

  const bgVideo =
    settings.menu_background_video;

  const logoSize =
    settings.logo_size || 32;

  const bgOverlayOpacity =
    settings.bg_overlay_opacity ?? 80;

  const navigateToView = (newView) => {
    setSearchParams(
      (currentParams) => {
        const next =
          new URLSearchParams(
            currentParams,
          );

        if (salonId) {
          next.set(
            'salon_id',
            salonId,
          );

          next.delete('salon');
          next.delete('salonId');
        }

        if (newView === 'choice') {
          next.delete('view');
        } else {
          next.set('view', newView);
        }

        return next;
      },
      {
        replace:
          newView === 'choice',
      },
    );
  };

  const clearGuestSession = () => {
    localStorage.removeItem(
      storageKey,
    );

    setGuestInfo(null);
    setOrders([]);
    setShowOrders(false);
    setMessageText('');
    setMessageSent(false);
    setFirstName('');
    setLastName('');

    navigateToView('choice');
  };

  useEffect(() => {
    if (!salonId) {
      setGuestInfo(null);
      return;
    }

    const stored =
      localStorage.getItem(
        storageKey,
      );

    if (!stored) {
      setGuestInfo(null);
      return;
    }

    try {
      const parsed =
        JSON.parse(stored);

      if (
        parsed?.salonId &&
        parsed.salonId !== salonId
      ) {
        localStorage.removeItem(
          storageKey,
        );

        setGuestInfo(null);
        return;
      }

      setGuestInfo(parsed);
    } catch (error) {
      console.error(
        'Failed to restore guest session:',
        error,
      );

      localStorage.removeItem(
        storageKey,
      );

      setGuestInfo(null);
    }
  }, [salonId, storageKey]);

  useEffect(() => {
    if (!salonId) {
      return undefined;
    }

    let isMounted = true;

    const loadSalonSettings = async () => {
      try {
        const response = await base44.functions.invoke('getGuestMenu', { salon_id: salonId });
        const payload = response?.data || response || {};
        if (isMounted) setSalonName(payload.settings?.salon_name || 'SalonFlow');
      } catch (error) {
        console.error('Failed to load public salon settings:', error);
      }
    };

    loadSalonSettings();

    const unsubscribe =
      base44.entities.SalonSetting.subscribe(
        (event) => {
          if (
            event.type !== 'create' &&
            event.type !== 'update'
          ) {
            return;
          }

          if (
            event.data?.salon_id !==
            salonId
          ) {
            return;
          }

          setSalonName(
            event.data?.salon_name ||
              'SalonFlow',
          );
        },
      );

    return () => {
      isMounted = false;

      if (
        typeof unsubscribe ===
        'function'
      ) {
        unsubscribe();
      }
    };
  }, [salonId]);

  useEffect(() => {
    if (
      !salonId ||
      !guestInfo?.session
    ) {
      setOrders([]);
      return undefined;
    }

    let isMounted = true;

    const loadGuestOrders =
      async () => {
        setOrdersLoading(true);

        try {
          const response =
            await base44.functions.invoke(
              'getGuestOrders',
              {
                salon_id: salonId,
                guest_session:
                  guestInfo.session,
              },
            );

          if (isMounted) {
            setOrders(
              response?.data?.orders ||
                [],
            );
          }
        } catch (error) {
          console.error(
            'Failed to load guest orders:',
            error,
          );

          if (isMounted) {
            setOrders([]);
          }
        } finally {
          if (isMounted) {
            setOrdersLoading(false);
          }
        }
      };

    loadGuestOrders();

    const unsubscribe =
      base44.entities.Order.subscribe(
        (event) => {
          const order = event.data;

          if (!order) {
            return;
          }

          if (
            order.guest_session !==
              guestInfo.session ||
            order.salon_id !== salonId
          ) {
            return;
          }

          if (
            event.type === 'create'
          ) {
            setOrders(
              (currentOrders) => {
                const alreadyExists =
                  currentOrders.some(
                    (
                      existingOrder,
                    ) =>
                      existingOrder.id ===
                      order.id,
                  );

                if (alreadyExists) {
                  return currentOrders;
                }

                return [
                  order,
                  ...currentOrders,
                ];
              },
            );
          }

          if (
            event.type === 'update'
          ) {
            setOrders(
              (currentOrders) =>
                currentOrders.map(
                  (
                    existingOrder,
                  ) =>
                    existingOrder.id ===
                    order.id
                      ? {
                          ...existingOrder,
                          ...order,
                        }
                      : existingOrder,
                ),
            );
          }

          if (
            event.type === 'delete'
          ) {
            setOrders(
              (currentOrders) =>
                currentOrders.filter(
                  (
                    existingOrder,
                  ) =>
                    existingOrder.id !==
                    order.id,
                ),
            );
          }
        },
      );

    return () => {
      isMounted = false;

      if (
        typeof unsubscribe ===
        'function'
      ) {
        unsubscribe();
      }
    };
  }, [
    salonId,
    guestInfo?.session,
  ]);

  const handleNameSubmit = (
    event,
  ) => {
    event.preventDefault();

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !salonId
    ) {
      return;
    }

    const info = {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      name: `${cleanFirstName} ${cleanLastName}`,
      session: generateSession(),
      salonId,
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify(info),
    );

    setGuestInfo(info);
    navigateToView('choice');
  };

  const handleSendMessage =
    async (event) => {
      event.preventDefault();

      const cleanMessage =
        messageText.trim();

      if (
        !cleanMessage ||
        !guestInfo?.name ||
        !salonId
      ) {
        return;
      }

      setSending(true);

      try {
        const guestMessage =
          await base44.entities.GuestMessage.create(
            {
              guest_name:
                guestInfo.name,
              guest_session:
                guestInfo.session,
              message: cleanMessage,
              salon_id: salonId,
            },
          );

        base44.functions
          .invoke(
            'createOperationalNotifications',
            {
              source_type:
                'guest_message',
              source_id:
                guestMessage.id,
              event_type:
                'created',
              salon_id: salonId,
            },
          )
          .catch((error) => {
            console.error(
              'Failed to create guest-message notification:',
              error,
            );
          });

        setMessageSent(true);
        setMessageText('');

        toast({
          title: 'Message sent',
          description:
            'The front desk has received your message.',
        });
      } catch (error) {
        console.error(
          'Failed to send guest message:',
          error,
        );

        toast({
          title: 'Failed to send',
          description:
            error?.message ||
            'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSending(false);
      }
    };

  if (!salonId) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)',
        }}
      >
        <Card className="glass-card w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <SalonLogo
              logoUrl={logoUrl}
              height={logoSize}
              large
            />

            <h1 className="mb-2 font-heading text-xl font-semibold">
              Salon Not Found
            </h1>

            <p className="text-sm text-muted-foreground">
              This link does not contain
              a valid salon identifier.
              Please scan the QR code at
              your salon again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!guestInfo) {
    return (
      <GuestShell
        bgImage={bgImage}
        bgVideo={bgVideo}
        overlayOpacity={
          bgOverlayOpacity
        }
      >
        <GuestView
          viewKey="guest-welcome"
          className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6"
        >
          <Card className="guest-welcome-card w-full max-w-md overflow-hidden border-white/25 bg-background/[0.32] shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />

                  Welcome experience
                </div>

                <SalonLogo
                  logoUrl={logoUrl}
                  height={logoSize}
                  large
                />

                <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  {displayName}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Enter your name to
                  continue into the guest
                  experience.
                </p>
              </div>

              <form
                onSubmit={
                  handleNameSubmit
                }
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name
                  </Label>

                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(
                        event.target.value,
                      )
                    }
                    placeholder="Jane"
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name
                  </Label>

                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(
                        event.target.value,
                      )
                    }
                    placeholder="Doe"
                    autoComplete="family-name"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl shadow-lg shadow-primary/15"
                >
                  Continue to Guest Menu
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                Your name is used only
                for your requests during
                this visit.
              </p>
            </CardContent>
          </Card>
        </GuestView>
      </GuestShell>
    );
  }

  if (view === 'choice') {
    return (
      <GuestShell
        bgImage={bgImage}
        bgVideo={bgVideo}
        overlayOpacity={
          bgOverlayOpacity
        }
      >
        <GuestView
          viewKey="guest-choice"
          className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6"
        >
          <div className="w-full max-w-lg space-y-4">
            <div className="mb-6 text-center">
              <SalonLogo
                logoUrl={logoUrl}
                height={logoSize}
                large
              />

              <h1 className="font-heading text-xl font-semibold">
                Welcome to{' '}
                {displayName},{' '}
                {guestInfo.firstName}!
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                What would you like to
                do?
              </p>
            </div>

            <Card
              role="button"
              tabIndex={0}
              className="group cursor-pointer border-white/20 bg-background/30 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-2xl hover:shadow-primary/10"
              onClick={() =>
                navigateToView('menu')
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key === ' '
                ) {
                  navigateToView(
                    'menu',
                  );
                }
              }}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Coffee className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h3 className="font-medium">
                    Browse Menu
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Request drinks,
                    refreshments,
                    products, or
                    services.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              className="group cursor-pointer border-white/20 bg-background/30 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-2xl hover:shadow-primary/10"
              onClick={() => {
                setMessageSent(false);
                navigateToView(
                  'message',
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key === ' '
                ) {
                  setMessageSent(
                    false,
                  );

                  navigateToView(
                    'message',
                  );
                }
              }}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h3 className="font-medium">
                    Leave a Message
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Send a note to the
                    front desk.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="ghost"
              className="w-full"
              onClick={
                clearGuestSession
              }
            >
              Change Guest Name
            </Button>
          </div>
        </GuestView>
      </GuestShell>
    );
  }

  if (view === 'message') {
    return (
      <GuestShell
        bgImage={bgImage}
        bgVideo={bgVideo}
        overlayOpacity={
          bgOverlayOpacity
        }
      >
        <GuestView viewKey="guest-message">
          <header className="glass-header safe-area-top sticky top-0 z-10 border-b">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigateToView(
                    'choice',
                  )
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />

                <span className="hidden sm:inline">
                  Back
                </span>
              </Button>

              <div className="flex min-w-0 items-center gap-2">
                <SalonLogo
                  logoUrl={logoUrl}
                  height={logoSize}
                />

                <span className="truncate font-heading text-sm font-semibold">
                  {displayName}
                </span>
              </div>

              <ThemeToggle />
            </div>
          </header>

          <div className="mx-auto max-w-2xl p-4">
            {messageSent ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />

                  <h2 className="mb-2 font-heading text-lg font-semibold">
                    Message Sent
                  </h2>

                  <p className="mb-6 text-sm text-muted-foreground">
                    The front desk has
                    received your
                    message.
                  </p>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setMessageSent(
                          false,
                        );

                        navigateToView(
                          'message',
                        );
                      }}
                    >
                      Send Another Message
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        navigateToView(
                          'choice',
                        )
                      }
                    >
                      Back to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />

                    <h2 className="font-heading text-lg font-semibold">
                      Message for Front
                      Desk
                    </h2>
                  </div>

                  <form
                    onSubmit={
                      handleSendMessage
                    }
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="guest-message">
                        Your Message
                      </Label>

                      <Textarea
                        id="guest-message"
                        value={
                          messageText
                        }
                        onChange={(
                          event,
                        ) =>
                          setMessageText(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Type your message for the front desk here..."
                        rows={6}
                        required
                      />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      From:{' '}
                      {guestInfo.name}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </GuestView>
      </GuestShell>
    );
  }

  return (
    <GuestShell
      bgImage={bgImage}
      bgVideo={bgVideo}
      overlayOpacity={
        bgOverlayOpacity
      }
    >
      <GuestView viewKey="guest-menu">
        <header className="glass-header safe-area-top sticky top-0 z-10 border-b">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigateToView(
                  'choice',
                )
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />

              <span className="hidden sm:inline">
                Back
              </span>
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <SalonLogo
                logoUrl={logoUrl}
                height={logoSize}
              />

              <span className="truncate font-heading text-sm font-semibold">
                {displayName}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowOrders(
                    (visible) =>
                      !visible,
                  )
                }
              >
                <Coffee className="mr-2 h-4 w-4" />

                <span className="hidden sm:inline">
                  Orders
                </span>

                {orders.length > 0 &&
                  ` (${orders.length})`}
              </Button>
            </div>
          </div>
        </header>

        {showOrders && (
          <div className="mx-auto max-w-4xl px-4 pt-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <h3 className="mb-3 font-medium">
                  Your Requests
                </h3>

                {ordersLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading requests...
                  </div>
                ) : orders.length ===
                  0 ? (
                  <p className="text-sm text-muted-foreground">
                    No requests yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orders.map(
                      (order) => {
                        const status =
                          getSafeStatus(
                            order.status,
                          );

                        return (
                          <div
                            key={
                              order.id
                            }
                            className="flex items-center justify-between gap-4 border-b py-2 last:border-0"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {order.item_name ||
                                  'Guest request'}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {order.created_date
                                  ? new Date(
                                      order.created_date,
                                    ).toLocaleTimeString(
                                      [],
                                      {
                                        hour: '2-digit',
                                        minute:
                                          '2-digit',
                                      },
                                    )
                                  : ''}
                              </div>
                            </div>

                            <Badge
                              variant={
                                status.variant
                              }
                            >
                              {
                                status.label
                              }
                            </Badge>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <MenuBrowser
            mode="guest"
            guestInfo={guestInfo}
            salonId={salonId}
          />
        </div>
      </GuestView>
    </GuestShell>
  );
}