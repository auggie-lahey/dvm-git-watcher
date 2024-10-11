import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {RepoWatchSubscription} from "../../RepoWatchSubscription.ts";

export class SaveWatchSubscriptionCommand implements ICommand {
    subscription!: RepoWatchSubscription
}

@injectable()
export class SaveWatchSubscriptionCommandHandler implements ICommandHandler<SaveWatchSubscriptionCommand> {

    private relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.relay = relayProvider.getDefaultPool();
    }

    async execute(command: SaveWatchSubscriptionCommand): Promise<void> {
        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const signer = new NSecSigner(secretKey);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: 30001, // Generic list
            pubkey: signerPubkey,
            content: JSON.stringify(command.subscription),
            created_at: nostrNow(),
            tags: [
                ['d', `repo-watch-${command.subscription.repoAddress.toString()}`]
            ]
        }

        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}