import axios from "axios";
import { getCanonicalOrigin } from "./site-url";

const mp = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export async function createPixCharge(params: {
  clientName: string;
  clientEmail: string;
  amount: number;
  description: string;
  externalReference: string;
}) {
  const res = await mp.post("/v1/payments", {
    transaction_amount: params.amount,
    description: params.description,
    payment_method_id: "pix",
    payer: {
      email: params.clientEmail || "cliente@semEmail.com",
      first_name: params.clientName.split(" ")[0],
      last_name: params.clientName.split(" ").slice(1).join(" ") || "-",
    },
    external_reference: params.externalReference,
    notification_url: `${getCanonicalOrigin()}/api/payments/webhook`,
  });

  const data = res.data;
  return {
    paymentId: String(data.id),
    pixCode: data.point_of_interaction?.transaction_data?.qr_code as string,
    pixQrCode: data.point_of_interaction?.transaction_data?.qr_code_base64 as string,
    status: data.status as string,
  };
}

export async function getPixPayment(paymentId: string) {
  const res = await mp.get(`/v1/payments/${paymentId}`);
  return res.data as { id: number; status: string; external_reference?: string };
}
