<script setup lang="ts">
import ConfirmDialog from './ConfirmDialog.vue';import {useDraftGuard} from '../lib/useDraftGuard';
import {ref} from 'vue';import {useForm} from '@inertiajs/vue3';
import SelectField from './SelectField.vue';
const props=defineProps<{profile:any}>();
const form=useForm({timezone:props.profile.timezone,reminder_local_time:props.profile.reminder_local_time.slice(0,5)});
const timezones=Intl.supportedValuesOf('timeZone').map(value=>({value,label:value.replaceAll('_',' ')}));
if(!timezones.some(option=>option.value===form.timezone))timezones.unshift({value:form.timezone,label:form.timezone.replaceAll('_',' ')});
const saving=ref(false);const draft=useDraftGuard(()=>form.isDirty,()=>form.processing||saving.value,()=>form.reset());
function save(){saving.value=true;form.patch('/profile',{preserveScroll:true,onFinish:()=>saving.value=false,onSuccess:()=>form.defaults(),onNetworkError:()=>{form.setError('timezone','Could not save. Your preferences are still here; try again.');return false;}});}
</script>
<template><div><form class="panel p-5" @submit.prevent="save"><h2>Time & reminders</h2><p class="help mt-1">Bill, loan and subscription reminders arrive in the app on the due date, in this timezone.</p><div class="mt-5 grid gap-4 sm:grid-cols-2"><div class="field"><label for="profile-timezone">Timezone</label><SelectField id="profile-timezone" v-model="form.timezone" searchable :options="timezones"/><p v-if="form.errors.timezone" class="help text-warning" role="alert">{{form.errors.timezone}}</p></div><div class="field"><label for="profile-reminder-time">Reminder time</label><input id="profile-reminder-time" v-model="form.reminder_local_time" type="time" required/><p class="help">Default 9:00 AM</p><p v-if="form.errors.reminder_local_time" class="help text-warning" role="alert">{{form.errors.reminder_local_time}}</p></div></div><div class="mt-4 flex items-center justify-end gap-3"><span v-if="form.recentlySuccessful" role="status" class="help">Preferences saved.</span><button class="btn-primary" :disabled="form.processing">{{form.processing?'Saving…':'Save'}}</button></div></form><ConfirmDialog :open="draft.discard.value" title="Discard unsaved changes?" @cancel="draft.cancel" @confirm="draft.confirm">Your changes have not been saved.</ConfirmDialog></div></template>
