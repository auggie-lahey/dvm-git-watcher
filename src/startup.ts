import { container } from 'tsyringe';
import pino from 'pino';
import {registerCommandHandler, registerEventHandler} from "./cqrs/base/cqrs.ts";
import {RepoWatchRequestedEvent, RepoWatchRequestedEventHandler} from "./cqrs/events/RepoWatchRequestedEvent.ts";
import {PublishTextNoteCommand, PublishTextNoteCommandHandler} from "./cqrs/commands/PublishTextNoteCommand.ts";
import { RelayProvider } from './RelayProvider.ts';
import {WatchRepositoryCommand, WatchRepositoryCommandHandler} from "./cqrs/commands/WatchRepositoryCommand.ts";
import {GitPatchEvent, GitPatchEventHandler} from "./cqrs/events/GitPatchEvent.ts";
import {GitStateAnnouncementEvent, GitStateAnnouncementEventHandler} from "./cqrs/events/GitStateAnnouncementEvent.ts";
import {EventListenerRegistry} from "./listeners/EventListenerRegistry.ts";
import {IEventListenerRegistry} from "./listeners/IEventListenerRegistry.ts";
import {nostrNow} from "./utils/nostrEventUtils.ts";
import { EventPublisher } from './publisher/EventPublisher.ts';
import {StartBuildCommand, StartBuildCommandHandler} from "./cqrs/commands/StartBuildCommand.ts";
import IEventHandler from "./cqrs/base/IEventHandler.ts";

export async function startup() {
    const logger = pino.pino();
    logger.info("Running startup");

    container.registerInstance("Logger", logger);
    container.register(RelayProvider.name, { useClass: RelayProvider });
    container.register(EventPublisher.name, { useClass: EventPublisher });

    // CQRS registrations
    registerEventHandler(RepoWatchRequestedEvent.name, RepoWatchRequestedEventHandler);
    registerEventHandler(GitPatchEvent.name, GitPatchEventHandler);
    registerEventHandler(GitStateAnnouncementEvent.name, GitStateAnnouncementEventHandler);

    registerCommandHandler(PublishTextNoteCommand.name, PublishTextNoteCommandHandler)
    registerCommandHandler(WatchRepositoryCommand.name, WatchRepositoryCommandHandler)
    registerCommandHandler(StartBuildCommand.name, StartBuildCommandHandler)

    container.registerSingleton(EventListenerRegistry.name, EventListenerRegistry);

    logger.info("All services registered");

    setupListeners()

    logger.info("Startup completed");
}

function setupListeners() {
    const eventListenerRegistry: IEventListenerRegistry = container.resolve(EventListenerRegistry.name);
    var filters = [
        {
            kinds: [68001],
            "#j": ["git-proposal-commit-watch"],
            limit: 1000,
            since: nostrNow()
        }
    ]

    const repoWatchRequestedEventHandler: IEventHandler<RepoWatchRequestedEvent> = container.resolve(RepoWatchRequestedEvent.name);
    eventListenerRegistry.add("watch-job-requests", filters, repoWatchRequestedEventHandler)
}
