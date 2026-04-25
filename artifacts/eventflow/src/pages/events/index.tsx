import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { useListEvents, ListEventsStatus } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function EventList() {
  const [status, setStatus] = useState<ListEventsStatus>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useListEvents({
    status: status === "all" ? undefined : status,
    search: debouncedSearch || undefined,
  });

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6 flex flex-col h-full min-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your event schedule and broadcasts.</p>
          </div>
          <Link href="/events/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
            <Plus className="w-4 h-4" />
            New Event
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 border rounded-xl shadow-sm">
          <Tabs value={status} onValueChange={(v) => setStatus(v as ListEventsStatus)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search events..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : data?.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed rounded-xl bg-muted/10">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No events found</h3>
              <p className="text-muted-foreground mt-1 mb-4">Try adjusting your filters or search query.</p>
              {status !== "all" || search !== "" ? (
                <Button variant="outline" onClick={() => { setStatus("all"); setSearch(""); }}>Clear Filters</Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
