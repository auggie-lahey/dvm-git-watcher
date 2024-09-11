import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import { getTag} from "../../utils/nostrEventUtils.ts";
import {resolveCommandHandler} from "../base/cqrs.ts";
import { Address } from '@welshman/util';
import {PublishTextNoteCommand} from "../commands/PublishTextNoteCommand.ts";
import ICommandHandler from "../base/ICommandHandler.ts";
import { nip19 } from 'nostr-tools';
import type IRelayProvider from "../../IRelayProvider.ts";

export class GitPatchEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class GitPatchEventHandler implements IEventHandler<GitPatchEvent> {


    private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject("RelayProvider") private relayProvider: IRelayProvider,
    ) {
        this.publishTextNoteCommandHandler = resolveCommandHandler(PublishTextNoteCommand.name)
    }

    async execute(event: GitPatchEvent): Promise<void> {
        console.log(event.nostrEvent)

        const repoAddress = Address.from(getTag(event.nostrEvent, "a")[1]);
        const authorNpub = nip19.npubEncode(event.nostrEvent.pubkey);
        const commitHash = getTag(event.nostrEvent, "commit")[1];

        this.publishTextNoteCommandHandler.execute({message: `nostr:${authorNpub} comitted \`${commitHash}\` to nostr:${repoAddress.toNaddr()} `})
    }
}