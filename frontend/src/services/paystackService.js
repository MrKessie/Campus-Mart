import api from './api';

export const PAYSTACK_PUBLIC_KEY = 'pk_test_c474927efd2bb2879ac5dace16988c8e75e2852a';

export async function initializeEscrow(listingId, amount) {
  const response = await api.post('/escrow/initialize', {
    listing_id: listingId,
    amount: amount,
  });
  return response.data;
}

export async function verifyEscrow(reference) {
  const response = await api.post(`/escrow/verify/${reference}`);
  return response.data;
}

export async function releaseEscrow(escrowId) {
  const response = await api.post(`/escrow/${escrowId}/release`);
  return response.data;
}

export async function getMyEscrows() {
  const response = await api.get('/my-escrows');
  return response.data;
}
