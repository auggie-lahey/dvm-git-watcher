import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import { getTag} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import {PublishTextNoteCommand} from "../commands/PublishTextNoteCommand.ts";
import type ICommandHandler from "../base/ICommandHandler.ts";
import { nip19 } from 'nostr-tools';

export class GitPatchEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class GitPatchEventHandler implements IEventHandler<GitPatchEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(PublishTextNoteCommand.name) private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>,
    ) {
    }

    async execute(event: GitPatchEvent): Promise<void> {
        console.log(event.nostrEvent)

        const repoAddress = Address.from(getTag(event.nostrEvent, "a")[1]);
        const authorNpub = nip19.npubEncode(event.nostrEvent.pubkey);
        const commitHash = getTag(event.nostrEvent, "commit")[1];

        this.publishTextNoteCommandHandler.execute({message: `nostr:${authorNpub} comitted \`${commitHash}\` to nostr:${repoAddress.toNaddr()} `})
    }
}