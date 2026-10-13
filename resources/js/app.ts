import '../css/app.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import { createApp, h, type DefineComponent } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
const pages=import.meta.glob<{default:DefineComponent}>('./Pages/**/*.vue');
createInertiaApp({
    title: title=> title ? title+' · Household' : 'Household',
    resolve: async name=>{const load=pages['./Pages/'+name+'.vue'];if(!load)throw new Error('Unknown page '+name);return (await load()).default;},
    setup({el,App,props,plugin}){createApp({render:()=>h(App,props)}).use(plugin).mount(el);},
    progress:{color:'#18181b'},
});
