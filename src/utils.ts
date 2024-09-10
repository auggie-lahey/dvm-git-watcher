import {NSecSigner} from "https://jsr.io/@nostrify/nostrify/0.30.1/NSecSigner.ts";

export function getParams(event: NostrEvent){
    const paramMap = event.tags
        .filter(item => item[0] === "param") // Filter arrays that start with "param"
        .reduce((map, item) => {
            const key = item[1];
            const value = item[2]; // Convert the third element to a number
            if (!isNaN(value)) {
                map.set(key, value);
            }
            return map;
        }, new Map<string, string>());

    return paramMap;
}

export const nostrNow = (): number => Math.floor(Date.now() / 1000);

export function getTag(event: NostrEvent, tagName: string) : string[] {
   return event.tags.filter(item => item[0] === tagName).reduce(item => item[0]);
}

export async function sendNote(pool: Npool, message: string){
    const secretKey: string = Deno.env.get("NSEC_HEX");
    const signer = new NSecSigner(secretKey);
    const signerPubkey = await signer.getPublicKey();

    var note = {
        kind: 1,
        tags: [
            ["j", "git-proposal-commit-watch"]
        ],
        pubkey: signerPubkey,
        content: message,
        created_at: nostrNow()
    }
    const envt = await signer.signEvent(note);

    await pool.event(envt)
}