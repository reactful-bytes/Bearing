import { createContext, ReactNode, useContext, useState } from 'react';

export type CreateFabAction = 'goal' | 'task' | 'note' | 'event' | 'focus';

type CreateFabContextValue = {
  visible: boolean;
  open: () => void;
  dismiss: () => void;
  create: (action: CreateFabAction) => void;
};

type CreateFabProviderProps = {
  children: ReactNode;
  onCreate: (action: CreateFabAction) => void;
};

const CreateFabContext = createContext<CreateFabContextValue | null>(null);

export function CreateFabProvider({ children, onCreate }: CreateFabProviderProps) {
  const [visible, setVisible] = useState(false);

  return (
    <CreateFabContext.Provider
      value={{
        visible,
        open: () => setVisible(true),
        dismiss: () => setVisible(false),
        create: (action) => {
          setVisible(false);
          onCreate(action);
        },
      }}
    >
      {children}
    </CreateFabContext.Provider>
  );
}

export function useCreateFab(): CreateFabContextValue | null {
  return useContext(CreateFabContext);
}

export function useRequiredCreateFab(): CreateFabContextValue {
  const context = useCreateFab();
  if (!context) {
    throw new Error('useRequiredCreateFab must be used within CreateFabProvider');
  }
  return context;
}
