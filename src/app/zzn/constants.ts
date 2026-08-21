export type ZznStatus = "DODELJENO" | "V_POVPRASEVANJU" | "ZA_NAROCILO" | "V_POTRJEVANJU" | "POTRJENO" | "NAROCENO";

export const ZZN_STATUS_LABELS: Record<ZznStatus, string> = {
  DODELJENO: "Dodeljeno",
  V_POVPRASEVANJU: "V povpraševanju",
  ZA_NAROCILO: "Za naročilo",
  V_POTRJEVANJU: "V potrjevanju",
  POTRJENO: "Potrjeno",
  NAROCENO: "Naročeno",
};
