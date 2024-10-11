import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import type ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import {PublishTextNoteCommand} from "./PublishTextNoteCommand.ts";
import type IEventHandler from "../base/IEventHandler.ts";
import {GitPatchEvent} from "../events/GitPatchEvent.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import { GitStateAnnouncementEvent } from '../events/GitStateAnnouncementEvent.ts';
import {EventListenerRegistry} from "../../listeners/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/IEventListenerRegistry.ts";
import {SaveWatchSubscriptionCommand} from "./SaveWatchSubscriptionCommand.ts";

export class WatchRepositoryCommand implements ICommand {
    repoAddress!: Address
    branchName!: string
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
        @inject(SaveWatchSubscriptionCommand.name) private saveWatchSubscriptionCommand: ICommandHandler<SaveWatchSubscriptionCommand>,
    ) {
    }

    async execute(command: WatchRepositoryCommand): Promise<void> {
        // subscribe to events for repository
        const repoKind = command.repoAddress.kind;
        const repoOwnerPubkey = command.repoAddress.pubkey;
        const repoIdentifier = command.repoAddress.identifier;
        //
        // // Listen for patches
        // const patchListenerId = `listen-patch-${command.repoAddress.toNaddr}`;
        // this.eventListenerRegistry.add(
        //     patchListenerId,
        //     [
        //         {
        //             kinds: [1617], // 1617 = Patches
        //             "#a": [`${repoKind}:${repoOwnerPubkey}:${repoIdentifier}`],
        //             limit: 50,
        //             since: nostrNow(),
        //         }
        //     ],
        //     this.gitPatchEventHandler
        // )

        // Listen for state announcements (commit by maintainer)
        // await this.saveWatchSubscriptionCommand.execute({
        //     subscription: {
        //         repoAddress: command.repoAddress.toNaddr().toString(),
        //         branchNames: [command.branchName],
        //         watchUntil: command.watchUntil
        //     }
        // })

        const stateAnnouncementListenerId = `listen-state-announcement-${command.repoAddress.toNaddr}`
        this.eventListenerRegistry.add(
            stateAnnouncementListenerId,
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