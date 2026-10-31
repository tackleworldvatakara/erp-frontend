import React, { useState, useEffect } from 'react';
import {
  Box, Button, Stack, Paper, Typography, TextField,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Chip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { categoriesApi, Category } from '../api/categories';

export default function CategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchCategories() {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch {
      enqueueSnackbar('Failed to load categories', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCategories(); }, []); // eslint-disable-line

  function openAdd() {
    setEditTarget(null);
    setName('');
    setDescription('');
    setNameError('');
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setNameError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { setNameError('Category name is required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await categoriesApi.update(editTarget._id, { name: name.trim(), description: description.trim() || undefined });
        enqueueSnackbar('Category updated', { variant: 'success' });
      } else {
        await categoriesApi.create({ name: name.trim(), description: description.trim() || undefined });
        enqueueSnackbar('Category created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await categoriesApi.delete(deleteTarget._id);
      enqueueSnackbar('Category deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box>
      <PageHeader
        title="Categories"
        subtitle="Manage product categories"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Category
          </Button>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : categories.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CategoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No categories yet</Typography>
          <Typography variant="body2" color="text.disabled" mb={2}>
            Add your first category to organise products
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Category
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {categories.map((cat) => (
            <Paper key={cat._id} sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <CategoryIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
              <Box flex={1}>
                <Typography variant="body1" fontWeight={600}>{cat.name}</Typography>
                {cat.description && (
                  <Typography variant="body2" color="text.secondary">{cat.description}</Typography>
                )}
              </Box>
              <Chip
                label={new Date(cat.createdAt).toLocaleDateString('en-IN')}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => openEdit(cat)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => setDeleteTarget(cat)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Category Name *"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              error={!!nameError}
              helperText={nameError}
              fullWidth
              size="small"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? This will fail if any products are using this category.`}
        confirmLabel="Delete"
        severity="error"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
