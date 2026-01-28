import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Upload, Building2, Loader2 } from 'lucide-react';

interface OrgPosition {
  id: string;
  name: string;
  title: string;
  department: string;
  parentId: string | null;
  photoUrl: string | null;
  level: number;
  order: number;
}

const DEPARTMENTS = [
  'Executive',
  'Operations',
  'Finance',
  'Technology',
  'Compliance',
  'Customer Service',
  'Marketing',
  'Human Resources'
];

const DEFAULT_POSITIONS: Omit<OrgPosition, 'id'>[] = [
  { name: 'CEO', title: 'Chief Executive Officer', department: 'Executive', parentId: null, photoUrl: null, level: 0, order: 0 },
  { name: 'COO', title: 'Chief Operating Officer', department: 'Operations', parentId: null, photoUrl: null, level: 1, order: 0 },
  { name: 'CFO', title: 'Chief Financial Officer', department: 'Finance', parentId: null, photoUrl: null, level: 1, order: 1 },
  { name: 'CTO', title: 'Chief Technology Officer', department: 'Technology', parentId: null, photoUrl: null, level: 1, order: 2 },
  { name: 'CCO', title: 'Chief Compliance Officer', department: 'Compliance', parentId: null, photoUrl: null, level: 1, order: 3 },
  { name: 'Head of Support', title: 'Customer Service Manager', department: 'Customer Service', parentId: null, photoUrl: null, level: 2, order: 0 },
  { name: 'Lead Developer', title: 'Senior Software Engineer', department: 'Technology', parentId: null, photoUrl: null, level: 2, order: 1 },
  { name: 'Finance Manager', title: 'Senior Accountant', department: 'Finance', parentId: null, photoUrl: null, level: 2, order: 2 },
];

export default function OrganizationalChart() {
  const queryClient = useQueryClient();
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({
    name: '',
    title: '',
    department: 'Executive',
    level: 0,
    order: 0,
    photoUrl: ''
  });

  const { data: positions = [], isLoading } = useQuery<OrgPosition[]>({
    queryKey: ['org-positions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/org-chart');
      if (!res.ok) throw new Error('Failed to fetch org chart');
      return res.json();
    }
  });

  const addMutation = useMutation({
    mutationFn: async (position: Omit<OrgPosition, 'id'>) => {
      const res = await apiRequest('POST', '/api/admin/org-chart', position);
      if (!res.ok) throw new Error('Failed to add position');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast.success('Position added successfully');
      setIsAddDialogOpen(false);
      setNewPosition({ name: '', title: '', department: 'Executive', level: 0, order: 0, photoUrl: '' });
    },
    onError: () => toast.error('Failed to add position')
  });

  const updateMutation = useMutation({
    mutationFn: async (position: OrgPosition) => {
      const res = await apiRequest('PUT', `/api/admin/org-chart/${position.id}`, position);
      if (!res.ok) throw new Error('Failed to update position');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast.success('Position updated successfully');
      setEditingPosition(null);
    },
    onError: () => toast.error('Failed to update position')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/org-chart/${id}`);
      if (!res.ok) throw new Error('Failed to delete position');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast.success('Position removed');
    },
    onError: () => toast.error('Failed to delete position')
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/org-chart/seed');
      if (!res.ok) throw new Error('Failed to seed positions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      toast.success('Default positions created');
    },
    onError: () => toast.error('Failed to create default positions')
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gradient-to-r from-purple-600 to-purple-800 text-white';
      case 1: return 'bg-gradient-to-r from-blue-500 to-blue-700 text-white';
      case 2: return 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-700 text-white';
    }
  };

  const groupedPositions = positions.reduce((acc, pos) => {
    if (!acc[pos.level]) acc[pos.level] = [];
    acc[pos.level].push(pos);
    return acc;
  }, {} as Record<number, OrgPosition[]>);

  Object.keys(groupedPositions).forEach(level => {
    groupedPositions[Number(level)].sort((a, b) => a.order - b.order);
  });

  const levels = Object.keys(groupedPositions).map(Number).sort((a, b) => a - b);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Organizational Chart
          </h1>
          <p className="text-muted-foreground">Company hierarchy and team structure</p>
        </div>
        <div className="flex gap-2">
          {positions.length === 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Create Default Structure
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-position">
                <Plus className="w-4 h-4 mr-2" /> Add Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Position</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    placeholder="John Doe"
                    data-testid="input-position-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newPosition.title}
                    onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                    placeholder="Chief Executive Officer"
                    data-testid="input-position-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newPosition.department} onValueChange={(v) => setNewPosition({ ...newPosition, department: v })}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level (0=Top)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={newPosition.level}
                      onChange={(e) => setNewPosition({ ...newPosition, level: parseInt(e.target.value) || 0 })}
                      data-testid="input-level"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newPosition.order}
                      onChange={(e) => setNewPosition({ ...newPosition, order: parseInt(e.target.value) || 0 })}
                      data-testid="input-order"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Photo URL (optional)</Label>
                  <Input
                    value={newPosition.photoUrl}
                    onChange={(e) => setNewPosition({ ...newPosition, photoUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    data-testid="input-photo-url"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={() => addMutation.mutate({ ...newPosition, parentId: null, photoUrl: newPosition.photoUrl || null })}
                  disabled={!newPosition.name || !newPosition.title || addMutation.isPending}
                  data-testid="button-save-position"
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Position
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {positions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No positions defined yet</h3>
            <p className="text-muted-foreground mb-4">Create your organizational structure by adding positions or use the default template.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Team Structure</CardTitle>
            <CardDescription>Click on any position to edit details or upload a photo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {levels.map((level) => (
                <div key={level} className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {level === 0 ? 'Executive Leadership' : level === 1 ? 'C-Suite / Directors' : level === 2 ? 'Management' : `Level ${level}`}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {groupedPositions[level].map((position) => (
                      <div
                        key={position.id}
                        className="relative group"
                        data-testid={`org-card-${position.id}`}
                      >
                        <div className={`w-48 p-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105 cursor-pointer ${getLevelColor(level)}`}>
                          <div className="flex flex-col items-center text-center">
                            <Avatar className="w-16 h-16 border-2 border-white/30 mb-3">
                              {position.photoUrl ? (
                                <AvatarImage src={position.photoUrl} alt={position.name} />
                              ) : null}
                              <AvatarFallback className="bg-white/20 text-white font-bold">
                                {getInitials(position.name)}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="font-bold text-sm">{position.name}</h3>
                            <p className="text-xs opacity-90">{position.title}</p>
                            <Badge variant="secondary" className="mt-2 text-xs bg-white/20 hover:bg-white/30 text-white border-0">
                              {position.department}
                            </Badge>
                          </div>
                        </div>
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="w-7 h-7 rounded-full shadow"
                            onClick={() => setEditingPosition(position)}
                            data-testid={`button-edit-${position.id}`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="w-7 h-7 rounded-full shadow"
                            onClick={() => {
                              if (confirm('Remove this position?')) {
                                deleteMutation.mutate(position.id);
                              }
                            }}
                            data-testid={`button-delete-${position.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingPosition} onOpenChange={(open) => !open && setEditingPosition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
          </DialogHeader>
          {editingPosition && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingPosition.name}
                  onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingPosition.title}
                  onChange={(e) => setEditingPosition({ ...editingPosition, title: e.target.value })}
                  data-testid="input-edit-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editingPosition.department} onValueChange={(v) => setEditingPosition({ ...editingPosition, department: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={editingPosition.level}
                    onChange={(e) => setEditingPosition({ ...editingPosition, level: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingPosition.order}
                    onChange={(e) => setEditingPosition({ ...editingPosition, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Photo URL</Label>
                <Input
                  value={editingPosition.photoUrl || ''}
                  onChange={(e) => setEditingPosition({ ...editingPosition, photoUrl: e.target.value || null })}
                  placeholder="https://example.com/photo.jpg"
                  data-testid="input-edit-photo"
                />
                <p className="text-xs text-muted-foreground">Paste a URL to an image, or upload to a hosting service first</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={() => editingPosition && updateMutation.mutate(editingPosition)}
              disabled={updateMutation.isPending}
              data-testid="button-update-position"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
