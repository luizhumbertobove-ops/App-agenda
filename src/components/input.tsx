import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const RING = {
  violet: "focus:ring-violet-300",
  danger: "focus:ring-red-300",
} as const;

type Ring = keyof typeof RING;

const BASE = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2";

export function Input({
  ring = "violet",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ring?: Ring }) {
  return <input {...props} className={`${BASE} ${RING[ring]} ${className}`} />;
}

export function Textarea({
  ring = "violet",
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ring?: Ring }) {
  return <textarea {...props} className={`${BASE} ${RING[ring]} resize-none ${className}`} />;
}
