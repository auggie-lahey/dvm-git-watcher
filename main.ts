import {NRelay1, NPool, NostrEvent, NSchema as n} from "@nostrify/nostrify";
import {NSet} from "https://jsr.io/@nostrify/nostrify/0.30.1/NSet.ts";
import {getParams, getTag, nostrNow, sendNote} from "./src/utils.ts";
import {Address} from "@welshman/util";
import {nip19} from "nostr-tools"

const events = new NSet();

const relays = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.primal.net'
];

const pool = new NPool({
  open(url) {
    return new NRelay1(relays[0]);
  },
  reqRouter: async (filters) => {
    return new Map(relays.map((relay) => {
      return [relay, filters];
    }));
  },
  eventRouter: async event => {
    return relays;
  },
});

// Now you can use the pool like a regular relay.
var filters = [
  {
    kinds: [68001],
    "#j": ["git-proposal-commit-watch"],
    limit: 1000
  }
]

for await (const msg of pool.req(filters, {})) {
  if (msg[0] === 'EVENT') {
    await handleEvent(msg[2]);
  }
  if (msg[0] === 'EOSE') {
    console.log("end of stream")
  }
}

function handlePatchEvent(patchEvent: any) {
  console.log(patchEvent)

  const repoAddress = Address.from(getTag(patchEvent, "a")[1]);
  const authorNpub = nip19.npubEncode(patchEvent.pubkey);
  const commitHash = getTag(patchEvent, "commit")[1];

  sendNote(pool,`nostr:${authorNpub} comitted \`${commitHash}\` to nostr:${repoAddress.toNaddr()} `)
}

async function watchRepositoryCommits(repoAddress: Address, watchDurationMs: number) {
  // broadcast
  // sendNote(`I started watching the following repository for the next ${watchDurationMs/1000/60} minute(s). nostr:${repoAddress} `)
  console.log(`Started listening to repo: ${repoAddress}`)

  // subscribe to events for repository
  const repoKind = repoAddress.kind;
  const repoOwnerPubkey = repoAddress.pubkey;
  const repoIdentifier = repoAddress.identifier;

  var patchFilters = [
    {
      kinds: [1617], // 1617 = Patches
      "#a": [`${repoKind}:${repoOwnerPubkey}:${repoIdentifier}`],
      limit: 2,
      // since: nostrNow(),
      since: 1722362400,
      // until: nostrNow()
      // until: 1725976800
    }
  ]

  console.log(filters)

  // Listen for repo events until watchDurationMs is over
  for await (const evnt of pool.req(patchFilters, {})) {
    if (evnt[0] === 'EVENT') {
      handlePatchEvent(evnt[2]);
    }
    if (evnt[0] === 'EOSE') {
      console.log("end of stream")
      // break; // TODO: keep listening
    }
  }
}

async function handleEvent(event: NostrEvent){
  // Deduplicate events
  if(events.has(event)){
    return;
  }
  events.add(event);

  console.log(event);

  // TODO: validation
  const params = getParams(event);

  if(params.get("duration_millis") === undefined){
    console.log("missing parameter duration_millis");
    return;
  }

  console.log(params);

  const watchDurationMs = params.get("duration_millis");
  const iTag = getTag(event, "i");
  const repoAddress = Address.fromNaddr(iTag[1]);

  await watchRepositoryCommits(repoAddress, watchDurationMs);
}



