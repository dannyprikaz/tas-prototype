export type OnLoadEventPayload = {
  url: string;
};

export type ScreenQRModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};
