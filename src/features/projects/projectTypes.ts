export type OnlineProject = {
  id: string;
  identifier: string;
  name: string;
  proponent: string;
  regulatoryPackage: "ROUANET" | "FSA_ANCINE";
  status: "EMPTY" | "IMPORTING" | "REVIEW" | "READY";
  createdAt: string;
};

export type CreateOnlineProjectInput = {
  identifier: string;
  name: string;
  proponent?: string;
  controller?: string;
  bankName?: string;
  agency?: string;
  account?: string;
};
