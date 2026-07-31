import { useState } from 'react';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { CreateNoteInput } from '../../features/notes/noteTypes';

type AddNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateNoteInput) => Promise<void>;
};

export function AddNoteModal({ visible, onClose, onSave }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm(): void {
    setTitle('');
    setBody('');
    setError(null);
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  async function handleSave(): Promise<void> {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError('Note body is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        body: trimmedBody,
        source: 'manual',
      });
      handleClose();
    } catch {
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="New Note" onClose={handleClose}>
      <FormField
        label="Title"
        accessibilityLabel="Note title"
        placeholder="Optional title"
        value={title}
        onChangeText={setTitle}
      />

      <FormField
        label="Body"
        accessibilityLabel="Note body"
        placeholder="Write your note..."
        value={body}
        onChangeText={setBody}
        multiline
        error={error}
      />

      <AppButton
        label="Save Note"
        accessibilityLabel="Save note"
        onPress={handleSave}
        loading={saving}
        loadingLabel="Saving..."
      />
    </AppModal>
  );
}
