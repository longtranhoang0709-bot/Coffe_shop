import api from './axios'

export const getProfile = () => api.get('/users/me').then(r => r.data.user)
export const saveProfile = (payload) => api.patch('/users/me', payload).then(r => r.data)
export const listAddresses = () => api.get('/users/me/addresses').then(r => r.data.addresses)
export const createAddress = (payload) => api.post('/users/me/addresses', payload).then(r => r.data)
export const editAddress = (id, payload) => api.patch(`/users/me/addresses/${id}`, payload).then(r => r.data)
export const setDefaultAddress = (id) => api.patch(`/users/me/addresses/${id}/default`).then(r => r.data)
export const removeAddress = (id) => api.delete(`/users/me/addresses/${id}`).then(r => r.data)
