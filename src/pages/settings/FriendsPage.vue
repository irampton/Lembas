<template>
  <section>
    <div>
      <div>
        <div>
          <p>Settings</p>
          <h1>Friends</h1>
          <p>Find friends, manage requests, and keep your sharing circle tidy.</p>
        </div>
        <button
            type="button"
            :disabled="friendStore.state.loading"
            @click="refresh"
        >
          Refresh
        </button>
      </div>

      <div>
        <div>
          <div>
            <p>Find people</p>
            <span>Search & invite</span>
          </div>
          <label>
            <input
                v-model="searchQuery"
                type="search"
                inputmode="search"
                placeholder="Search by username"
            />
          </label>
          <p v-if="searchError">{{ searchError }}</p>
          <div v-if="searchLoading">Searching…</div>
          <div v-else-if="!searchResults.length && searchQuery.trim()">
            No users found.
          </div>
          <div v-else>
            <div
                v-for="user in searchResults"
                :key="user.id"
            >
              <div>
                <p>{{ user.username }}</p>
                <p>
                  <span v-if="user.isFriend">Already friends</span>
                  <span v-else-if="user.incomingRequest">Sent you a request</span>
                  <span v-else-if="user.outgoingRequest">Request sent</span>
                  <span v-else>Send a friend request</span>
                </p>
              </div>
              <div>
                <button
                    v-if="user.isFriend"
                    type="button"
                    disabled
                >
                  Friends
                </button>
                <div v-else-if="user.incomingRequest">
                  <button
                      type="button"
                      :disabled="actionBusy === user.id"
                      @click="acceptIncoming(user.id)"
                  >
                    Accept
                  </button>
                  <button
                      type="button"
                      :disabled="actionBusy === user.id"
                      @click="rejectIncoming(user.id)"
                  >
                    Reject
                  </button>
                </div>
                <button
                    v-else-if="user.outgoingRequest"
                    type="button"
                    disabled
                >
                  Pending
                </button>
                <button
                    v-else
                    type="button"
                    :disabled="actionBusy === user.id"
                    @click="sendRequest(user.id)"
                >
                  Add friend
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div>
            <p>Requests</p>
            <span>{{ incomingRequests.length }} waiting</span>
          </div>
          <div>
            <div v-if="incomingRequests.length">
              <p>Incoming</p>
              <div
                  v-for="req in incomingRequests"
                  :key="req.id"
              >
                <div>
                  <p>{{ req.username }}</p>
                  <p>Sent a request</p>
                </div>
                <div>
                  <button
                      type="button"
                      :disabled="actionBusy === req.id"
                      @click="accept(req.id)"
                  >
                    Accept
                  </button>
                  <button
                      type="button"
                      :disabled="actionBusy === req.id"
                      @click="reject(req.id)"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
            <div v-if="outgoingRequests.length">
              <p>Outgoing</p>
              <div
                  v-for="req in outgoingRequests"
                  :key="req.id"
              >
                <div>
                  <p>{{ req.username }}</p>
                  <p>Waiting on them</p>
                </div>
                <span>Pending</span>
              </div>
            </div>
            <p v-if="!incomingRequests.length && !outgoingRequests.length">
              No requests right now.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div>
          <p>Your friends</p>
          <span>{{ friends.length }} total</span>
        </div>
        <div v-if="friendStore.state.loading && !friendStore.state.ready">
          Loading friends…
        </div>
        <div v-else>
          <div
              v-for="friend in friends"
              :key="friend.userId"
          >
            <div>
              <p>{{ friend.username }}</p>
              <p>Connected</p>
            </div>
            <button
                type="button"
                :disabled="actionBusy === friend.userId"
                @click="remove(friend)"
            >
              Remove
            </button>
          </div>
          <p v-if="!friends.length">No friends yet. Send a request to get started.</p>
        </div>
      </div>

      <p v-if="pageError">{{ pageError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useFriendStore } from '../../stores/friendStore.js';

const friendStore = useFriendStore();

const friends = computed( () => friendStore.state.friends || [] );
const incomingRequests = computed( () => friendStore.state.incoming || [] );
const outgoingRequests = computed( () => friendStore.state.outgoing || [] );

const searchQuery = ref( '' );
const rawResults = ref( [] );
const searchLoading = ref( false );
const searchError = ref( null );
const pageError = ref( null );
const actionBusy = ref( null );
let debounceId = null;

const mergedResults = computed( () =>
    rawResults.value.map( ( user ) => {
      const isFriend = friends.value.some( ( f ) => f.userId === user.id ) || user.isFriend;
      const incomingRequest =
          incomingRequests.value.some( ( req ) => req.fromUserId === user.id ) || Boolean( user.incomingRequest );
      const outgoingRequest =
          outgoingRequests.value.some( ( req ) => req.toUserId === user.id ) || Boolean( user.outgoingRequest );
      return { ...user, isFriend, incomingRequest, outgoingRequest };
    } )
);

const searchResults = computed( () => mergedResults.value );

const refresh = async () => {
  pageError.value = null;
  try {
    await friendStore.loadFriends( true );
    if ( searchQuery.value.trim() ) {
      await runSearch( searchQuery.value );
    }
  } catch ( error ) {
    pageError.value = error.message || 'Unable to refresh friends.';
  }
};

const runSearch = async ( value ) => {
  const query = value.trim();
  if ( !query ) {
    rawResults.value = [];
    searchError.value = null;
    return;
  }
  searchLoading.value = true;
  searchError.value = null;
  try {
    const res = await fetch( `/api/friends/search?q=${ encodeURIComponent( query ) }`, { credentials: 'include' } );
    const data = await res.json();
    if ( !res.ok || !data.success ) throw new Error( data?.error || 'Unable to search users.' );
    rawResults.value = data.users || [];
  } catch ( error ) {
    searchError.value = error.message || 'Unable to search users.';
  } finally {
    searchLoading.value = false;
  }
};

watch(
    () => searchQuery.value,
    ( value ) => {
      if ( debounceId ) clearTimeout( debounceId );
      debounceId = setTimeout( () => runSearch( value ), 200 );
    }
);

const sendRequest = async ( userId ) => {
  pageError.value = null;
  actionBusy.value = userId;
  try {
    await friendStore.sendRequest( userId );
    await refresh();
  } catch ( error ) {
    pageError.value = error.message || 'Unable to send request.';
  } finally {
    actionBusy.value = null;
  }
};

const accept = async ( requestId ) => {
  pageError.value = null;
  actionBusy.value = requestId;
  try {
    await friendStore.acceptRequest( requestId );
    await refresh();
  } catch ( error ) {
    pageError.value = error.message || 'Unable to accept request.';
  } finally {
    actionBusy.value = null;
  }
};

const reject = async ( requestId ) => {
  pageError.value = null;
  actionBusy.value = requestId;
  try {
    await friendStore.rejectRequest( requestId );
    await refresh();
  } catch ( error ) {
    pageError.value = error.message || 'Unable to reject request.';
  } finally {
    actionBusy.value = null;
  }
};

const acceptIncoming = async ( userId ) => {
  const req = incomingRequests.value.find( ( r ) => r.fromUserId === userId );
  if ( !req ) return;
  await accept( req.id );
};

const rejectIncoming = async ( userId ) => {
  const req = incomingRequests.value.find( ( r ) => r.fromUserId === userId );
  if ( !req ) return;
  await reject( req.id );
};

const remove = async ( friend ) => {
  if ( !friend ) return;
  if ( !window.confirm( `Remove ${ friend.username } from your friends?` ) ) return;
  pageError.value = null;
  actionBusy.value = friend.userId;
  try {
    await friendStore.removeFriend( friend.userId );
    await refresh();
  } catch ( error ) {
    pageError.value = error.message || 'Unable to remove friend.';
  } finally {
    actionBusy.value = null;
  }
};

onMounted( () => {
  friendStore.loadFriends();
} );
</script>
