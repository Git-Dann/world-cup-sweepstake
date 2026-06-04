"use client";

// Submits a server action after a confirmation prompt.
export function ConfirmButton({
  action,
  confirmText,
  className,
  style,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmText: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className={className} style={style}>
        {children}
      </button>
    </form>
  );
}
