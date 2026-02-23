export interface Communication {
  communication_id: number;
  fk_owner_id: number;
  communication_code: string;
  communication_desc: string;
  communication_ver: string;
  communication_active: "Y" | "N";
  communication_json: string | null;
  last_update?: string;
  button_delete?: string;
  button_show?: string;
}

export interface CommunicationListResponse {
  code: number;
  message: string;
  dataRows: number;
  data: Communication[];
}

export interface AddCommunicationPayload {
  communication_code: string;
  communication_desc: string;
  communication_ver: string;
  communication_active: "Y" | "N";
  communication_json?: string;
  o_id?: number;
}

export interface DeleteCommunicationPayload {
  communication_id: number;
}

export interface ApiResponse<T = null> {
  code: number;
  message: string;
  data?: T;
}

export type AddCommunicationInput = {
  communication_code: string;
  communication_desc: string;
  communication_ver: string;
  communication_active: "Y" | "N";
  communication_json?: string | undefined;
  o_id: number;
};

export type DeleteCommunicationInput = {
  communication_id: number;
  o_id: number;
};

export type GetCommunicationInput = {
  o_id: number;
};