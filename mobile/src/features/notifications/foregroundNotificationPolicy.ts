let focusSessions = 0;

export function suppressForegroundReminders(): () => void {
  focusSessions += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    focusSessions -= 1;
  };
}

export function shouldPresentReminder(): boolean {
  return focusSessions === 0;
}
