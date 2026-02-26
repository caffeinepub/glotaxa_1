import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    addApiKey(apiKey: string): Promise<boolean>;
    addOwner(newOwner: Principal): Promise<boolean>;
    checkApiKey(apiKey: string): Promise<boolean>;
    listVatRates(): Promise<Array<[bigint, number]>>;
    payVat(amount: number, vatKey: bigint): Promise<number>;
    removeApiKey(apiKey: string): Promise<boolean>;
    upsertVat(key: bigint, rate: number): Promise<boolean>;
}
