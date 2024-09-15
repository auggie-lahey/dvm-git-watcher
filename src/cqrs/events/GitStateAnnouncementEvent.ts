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

export class GitStateAnnouncementEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class GitStateAnnouncementEventHandler implements IEventHandler<GitStateAnnouncementEvent> {


    private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
        this.publishTextNoteCommandHandler = resolveCommandHandler(PublishTextNoteCommand.name)
    }

    async execute(event: GitStateAnnouncementEvent): Promise<void> {
        console.log(event.nostrEvent)

        // TODO: We need to verify the author, now everyone can send this event
        const authorNpub = nip19.npubEncode(event.nostrEvent.pubkey);
        const repoIdentifier = getTag(event.nostrEvent, "d")[1]
        const head = getTag(event.nostrEvent, "HEAD")[1];

        const repoAddress = new Address(30617, event.nostrEvent.pubkey, repoIdentifier)

        await this.publishTextNoteCommandHandler.execute({message: `nostr:${authorNpub} changed HEAD of \`${head}\` on repo:${repoAddress.toNaddr()} `})
    }
}