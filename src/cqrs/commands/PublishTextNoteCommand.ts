import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';

export class PublishTextNoteCommand implements ICommand {
    message!: string;
}

@injectable()
export class PublishTextNoteCommandHandler implements ICommandHandler<PublishTextNoteCommand> {

    private relay: NRelay;
    private logger: pino.Logger;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();

    }

    async execute(command: PublishTextNoteCommand): Promise<void> {
        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const signer = new NSecSigner(secretKey);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: 1,
            pubkey: signerPubkey,
            content: command.message,
            created_at: nostrNow(),
            tags: []
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}