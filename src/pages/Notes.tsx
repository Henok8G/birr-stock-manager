import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNotes, Note } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Loader2, StickyNote, History } from 'lucide-react';

export default function Notes() {
  const { notes, isLoading, addNote, updateNote, deleteNote } = useNotes();
  const { isOwner } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim()) return;
    addNote.mutate({ title: title.trim(), content: content.trim() }, {
      onSuccess: () => { setTitle(''); setContent(''); },
    });
  };

  const handleEdit = () => {
    if (!editingNote || !editTitle.trim()) return;
    updateNote.mutate({ id: editingNote.id, title: editTitle.trim(), content: editContent.trim() }, {
      onSuccess: () => setEditingNote(null),
    });
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group notes by date
  const groupedNotes: Record<string, Note[]> = {};
  notes.forEach((note) => {
    const dateKey = format(new Date(note.created_at), 'yyyy-MM-dd');
    if (!groupedNotes[dateKey]) groupedNotes[dateKey] = [];
    groupedNotes[dateKey].push(note);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        <p className="text-muted-foreground">Write and manage notes</p>
      </div>

      <Tabs defaultValue={isOwner ? 'write' : 'history'}>
        <TabsList>
          {isOwner && <TabsTrigger value="write" className="gap-2"><StickyNote className="h-4 w-4" />Write Note</TabsTrigger>}
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Note History</TabsTrigger>
        </TabsList>

        {isOwner && (
          <TabsContent value="write" className="space-y-4">
            <Card className="p-6 space-y-4">
              <Input
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Write your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              <Button onClick={handleAdd} disabled={!title.trim() || addNote.isPending} className="gap-2">
                <Plus className="h-4 w-4" />
                {addNote.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-6">
          {Object.keys(groupedNotes).length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No notes yet.
            </Card>
          ) : (
            Object.entries(groupedNotes).map(([dateKey, dayNotes]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-2">
                  {dayNotes.map((note) => (
                    <Card key={note.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{note.title}</h4>
                          {note.content && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.content}</p>
                          )}
                          <p className="text-xs text-muted-foreground/60 mt-2">
                            {format(new Date(note.created_at), 'h:mm a')}
                            {note.updated_at !== note.created_at && ' (edited)'}
                          </p>
                        </div>
                        {isOwner && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(note)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(note.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editTitle.trim() || updateNote.isPending}>
              {updateNote.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Delete Note?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { deleteNote.mutate(deleteConfirm); setDeleteConfirm(null); } }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
