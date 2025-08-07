import api from "./api";

export const getCert = async (id) => {
    console.log('Called getCert');
    const response = await api.get(`/certificates/${id}`);
    return response.data;
}