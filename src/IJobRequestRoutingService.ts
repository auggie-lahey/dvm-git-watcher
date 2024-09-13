import {NostrEvent} from '@nostrify/nostrify';

export default interface IJobRequestRoutingService {
    route(jobType: string, event: NostrEvent): Promise<void>;
}

