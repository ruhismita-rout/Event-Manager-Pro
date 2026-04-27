import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, ArrowRight, Radio } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const { loginOrganizer } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = loginOrganizer({ name, code });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Organizer access granted");
      setLocation("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="surface-hero surface-mesh min-h-screen p-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center gap-8">
          <div className="relative w-full rounded-none border-0 bg-transparent pt-10">
            <Badge className="absolute left-0 top-0 bg-card text-foreground shadow-[4px_4px_0_hsl(var(--border))]">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Organizer Window
            </Badge>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="space-y-4 self-start">
                <div className="surface-glass bg-card p-6 sm:p-8">
                  <h1 className="text-balance text-5xl font-black tracking-tight sm:text-6xl">
                    Sign in to manage streams, events, and the organizer dashboard.
                  </h1>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                    Viewers can join events, register, and chat openly. This login unlocks organizer-only controls like live broadcast management and event editing.
                  </p>
                </div>
              </div>

              <Card className="self-start shadow-[8px_8px_0_hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-2xl">Organizer sign in</CardTitle>
                  <CardDescription>Use the access code configured for the organizer window.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-5" onSubmit={handleLogin}>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Display name</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your organizer name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Access code</label>
                      <Input value={code} onChange={(e) => setCode(e.target.value)} type="password" placeholder="Organizer access code" />
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button type="submit" disabled={isSubmitting} className="min-w-40">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Signing in..." : "Enter organizer window"}
                      </Button>
                      <Link href="/">
                        <Button type="button" variant="outline">
                          Back to public events
                        </Button>
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-glass bg-card p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center border-2 border-border bg-accent shadow-[3px_3px_0_hsl(var(--border))]">
                <Radio className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black uppercase">What organizers can do</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li>• Start and stop livestreams</li>
                <li>• Create, edit, and manage events</li>
                <li>• View the organizer dashboard</li>
              </ul>
            </div>
            <div className="surface-glass bg-card p-5">
              <h2 className="text-xl font-black uppercase">What viewers can do</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li>• Watch the livestream</li>
                <li>• Register for events</li>
                <li>• Chat during live sessions</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-foreground/80">
            Default access code: <span className="font-mono font-bold">eventflow</span>
          </p>
        </div>
      </div>
    </div>
  );
}
