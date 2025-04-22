"use client"

import { ChangeEvent, useEffect, useRef, useState, type FormEvent } from "react"
import { Loader2, Plus, Trash2, RefreshCw, CheckCircle2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface ConnectionInfo {
  usingDapr: boolean;
  storeName: string | null;
  kind: string;        // simplified – any string
}

interface Item {
  id?: string;
  title: string;
  done: boolean;
  clientId?: string;
}

interface ItemResponse {
  message: string | null;
  items: Item[];
  connection?: ConnectionInfo;   // <-- add this line
}

/* ------------------------------------------------------------------ */
/* REST helpers (call our own API routes)                              */
/* ------------------------------------------------------------------ */
const list   = () => fetch('/api/todos',       { cache: 'no-store' }).then(r => r.json()) as Promise<ItemResponse>;
const create = (i: Item) => fetch('/api/todos',          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(i) }).then(r => r.json()) as Promise<Item>;
const update = (i: Item) => fetch(`/api/todos/${i.id}`,  { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(i) });
const remove = (id?: string) => id ? fetch(`/api/todos/${id}`, { method: 'DELETE' }) : Promise.resolve();

/* ------------------------------------------------------------------ */
/* React component                                                     */
/* ------------------------------------------------------------------ */
function TodoPage() {
  /* ----- state ---------------------------------------------------- */
  const [data,       setData]       = useState<ItemResponse | null>(null);
  const [title,      setTitle]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);

  const { toast }        = useToast();
  const inputRef         = useRef<HTMLInputElement>(null);
  const clientIdCounter  = useRef(0);
  const nextClientId     = () => `c‑${++clientIdCounter.current}`;

  /* ----- initial load / refresh ----------------------------------- */
  const refresh = async () => {
    setLoading(true);
    try {
      const res   = await list();
      const items = res.items.map(i => ({ ...i, clientId: nextClientId() }));
      setData({ ...res, items });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load items', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  /* ----- add ------------------------------------------------------ */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const cid      = nextClientId();
    const tempItem = { id: `temp-${cid}`, title: trimmed, done: false, clientId: cid };

    setData(d => d ? { ...d, items: [...d.items, tempItem] } : d);
    setTitle('');

    try {
      const real = await create({ title: trimmed, done: false });
      setData(d =>
        d ? { ...d, items: d.items.map(i => (i.clientId === cid ? { ...real, clientId: cid } : i)) } : d,
      );
      toast({ title: 'Added', description: 'Task added successfully.' });
    } catch (e) {
      console.error(e);
      setData(d => d ? { ...d, items: d.items.filter(i => i.clientId !== cid) } : d);
      toast({ title: 'Error', description: 'Failed to add task', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  /* ----- toggle --------------------------------------------------- */
  const onToggle = async (item: Item) => {
    setBusy(item.clientId ?? null);
    setData(d =>
      d ? { ...d, items: d.items.map(i => (i.clientId === item.clientId ? { ...i, done: !i.done } : i)) } : d,
    );
    try {
      await update({ ...item, done: !item.done });
    } catch (e) {
      console.error(e);
      setData(d =>
        d ? { ...d, items: d.items.map(i => (i.clientId === item.clientId ? { ...i, done: item.done } : i)) } : d,
      );
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  /* ----- delete --------------------------------------------------- */
  const onDelete = async (item: Item) => {
    setBusy(item.clientId ?? null);
    setData(d => d ? { ...d, items: d.items.filter(i => i.clientId !== item.clientId) } : d);
    try {
      await remove(item.id);
    } catch (e) {
      console.error(e);
      setData(d => d ? { ...d, items: [...d.items, item] } : d);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  /* ----- UI ------------------------------------------------------- */
  return (
    <main className="container mx-auto py-10 px-4 max-w-3xl">
      <Card>
      <CardHeader className="pb-3">
  <div className="flex items-center justify-between">
    <CardTitle className="text-2xl font-bold">Todo List</CardTitle>

    {/* connection badge */}
    {data?.connection && (
      <Badge variant={data.connection.usingDapr ? 'default' : 'secondary'}>
        {data.connection.usingDapr
          ? `Dapr • ${data.connection.storeName ?? 'unknown'}`
          : `Repo • ${data.connection.kind}`}
      </Badge>
    )}

    <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      <span className="sr-only">Refresh</span>
    </Button>
  </div>
          {data?.message && (
            <Badge variant="outline" className="text-xs font-normal">
              {data.message}
            </Badge>
          )}
        </CardHeader>

        <CardContent>
          {/* add form ------------------------------------------------ */}
          <form onSubmit={onSubmit} className="flex gap-2 mb-6">
            <Input
              ref={inputRef}
              placeholder="What needs to be done?"
              className="flex-1"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              disabled={submitting}
              autoFocus
            />
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
            </Button>
          </form>

          {/* list ---------------------------------------------------- */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : data?.items?.length ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Done</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {data.items.map(item => (
                      <motion.tr
                        key={item.clientId}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.3 }}
                        className={cn(item.done && 'bg-muted/40')}
                        layout
                      >
                        <TableCell>
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={() => onToggle(item)}
                            disabled={busy === item.clientId}
                          />
                        </TableCell>
                        <TableCell>
                          <motion.span
                            layout
                            className={cn('font-medium', item.done && 'line-through text-muted-foreground')}
                            animate={{ opacity: busy === item.clientId ? 0.5 : 1 }}
                          >
                            {item.title}
                          </motion.span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            disabled={busy === item.clientId}
                          >
                            {busy === item.clientId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">All done!</h3>
              <p className="text-sm text-muted-foreground">You have no tasks to complete.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
          {!loading && data?.items && (
            <div className="flex justify-between w-full">
              <span>{data.items.filter(i => !i.done).length} task(s) remaining</span>
              <span>{data.items.filter(i => i.done).length} task(s) completed</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

/* ------------------------------------------------------------------ */
export default TodoPage;