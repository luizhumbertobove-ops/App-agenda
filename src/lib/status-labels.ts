type StatusInfo = { label: string; className: string };

export const APPOINTMENT_STATUS: Record<string, StatusInfo> = {
  SCHEDULED: { label: "Agendado", className: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmado", className: "bg-green-100 text-green-700" },
  DONE: { label: "Concluído", className: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelado", className: "bg-red-100 text-red-600" },
};

export const PAYMENT_STATUS: Record<string, StatusInfo> = {
  PENDING: { label: "Pendente", className: "bg-amber-100 text-amber-700" },
  SENT: { label: "Enviado", className: "bg-blue-100 text-blue-700" },
  PAID: { label: "Pago", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Vencido", className: "bg-red-100 text-red-600" },
};

export const MESSAGE_TYPE: Record<string, StatusInfo> = {
  CONFIRMATION: { label: "Confirmação", className: "bg-blue-100 text-blue-700" },
  PAYMENT_LINK: { label: "Pagamento", className: "bg-amber-100 text-amber-700" },
  REENGAGEMENT: { label: "Reengajamento", className: "bg-purple-100 text-purple-700" },
  NO_SHOW: { label: "Não compareceu", className: "bg-orange-100 text-orange-700" },
};

export const FALLBACK_STATUS: StatusInfo = { label: "", className: "bg-gray-100 text-gray-600" };
