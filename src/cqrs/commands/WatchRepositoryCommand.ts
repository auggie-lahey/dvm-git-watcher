import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import {PublishTextNoteCommand} from "./PublishTextNoteCommand.ts";
import type IEventHandler from "../base/IEventHandler.ts";
import {GitPatchEvent} from "../events/GitPatchEvent.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import { GitStateAnnouncementEvent } from '../events/GitStateAnnouncementEvent.ts';
import {EventListenerRegistry} from "../../listeners/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/IEventListenerRegistry.ts";

export class WatchRepositoryCommand implements ICommand {
    repoAddress!: Address
    watchUntil!: number
}

@injectable()
export class WatchRepositoryCommandHandler implements ICommandHandler<WatchRepositoryCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
        @inject(GitStateAnnouncementEvent.name) private gitStateAnnouncementEventHandler: IEventHandler<GitStateAnnouncementEvent>,
        @inject(GitPatchEvent.name) private gitPatchEventHandler: IEventHandler<GitPatchEvent>,
        @inject(PublishTextNoteCommand.name) private publishTextNoteCommandHandler: IEventHandler<PublishTextNoteCommand>,
    ) {
    }

    async execute(command: WatchRepositoryCommand): Promise<void> {
        // subscribe to events for repository
        const repoKind = command.repoAddress.kind;
        const repoOwnerPubkey = command.repoAddress.pubkey;
        const repoIdentifier = command.repoAddress.identifier;

        // Listen for patches
        this.eventListenerRegistry.add(
            `listen-patch-${command.repoAddress.toNaddr}`,
            [
                {
                    kinds: [1617], // 1617 = Patches
                    "#a": [`${repoKind}:${repoOwnerPubkey}:${repoIdentifier}`],
                    limit: 50,
                    since: nostrNow(),
                }
            ],
            this.gitPatchEventHandler
        )

        // Listen for state announcements (commit by maintainer)
        this.eventListenerRegistry.add(
            `listen-state-announcment-${command.repoAddress.toNaddr}`,
            [
                {
                    kinds: [30618], // 30618 = State announcement
                    authors: [repoOwnerPubkey],
                    "#d": [repoIdentifier],
                    limit: 50,
                    since: nostrNow(),
                }
            ],
            this.gitStateAnnouncementEventHandler
        )

        // broadcast
        await this.publishTextNoteCommandHandler.execute({message: `I started watching the following repository until ${command.watchUntil}. nostr:${command.repoAddress.toNaddr()} `})
        this.logger.info(`Started listening to repo: ${command.repoAddress} (${command.repoAddress.toNaddr})`)
    }
}