"use client";

export function SelectAll({ form }: { form: string }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        className="size-4"
        onChange={(e) => {
          const boxes = document.querySelectorAll<HTMLInputElement>(`#${form} input[name="id"]`);
          boxes.forEach((b) => (b.checked = e.target.checked));
        }}
      />
      All on page
    </label>
  );
}
