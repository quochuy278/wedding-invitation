import axios from "axios";
import { apiConfig } from "./config";

export const apiClient = axios.create({
  ...apiConfig,
  headers: {
    Accept: "application/json",
  },
});
