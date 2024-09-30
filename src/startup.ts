import { container } from 'tsyringe';
import pino from 'pino';
import {registerCommandHandler, registerEventHandler, resolveEventHandler} from "./cqrs/base/cqrs.ts";
import {RepoWatchRequestedEvent, RepoWatchRequestedEventHandler} from "./cqrs/events/RepoWatchRequestedEvent.ts";
import {PublishTextNoteCommand, PublishTextNoteCommandHandler} from "./cqrs/commands/PublishTextNoteCommand.ts";
import { RelayProvider } from './RelayProvider.ts';
import {WatchRepositoryCommand, WatchRepositoryCommandHandler} from "./cqrs/commands/WatchRepositoryCommand.ts";
import {GitPatchEvent, GitPatchEventHandler} from "./cqrs/events/GitPatchEvent.ts";
import {GitStateAnnouncementEvent, GitStateAnnouncementEventHandler} from "./cqrs/events/GitStateAnnouncementEvent.ts";
import {EventListenerRegistry} from "./listeners/base/EventListenerRegistry.ts";
import {IEventListenerRegistry} from "./listeners/base/IEventListenerRegistry.ts";
import {nostrNow} from "./utils/nostrEventUtils.ts";

export async function startup() {
    const logger = pino();
    logger.info("Running startup");

    container.registerInstance("Logger", logger);
    container.register(RelayProvider.name, { useClass: RelayProvider });

    // CQRS registrations
    registerEventHandler(RepoWatchRequestedEvent.name, RepoWatchRequestedEventHandler);
    registerEventHandler(GitPatchEvent.name, GitPatchEventHandler);
    registerEventHandler(GitStateAnnouncementEvent.name, GitStateAnnouncementEventHandler);

    registerCommandHandler(PublishTextNoteCommand.name, PublishTextNoteCommandHandler)
    registerCommandHandler(WatchRepositoryCommand.name, WatchRepositoryCommandHandler)

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

    eventListenerRegistry.add("watch-job-requests", filters, resolveEventHandler(RepoWatchRequestedEvent.name))
}
