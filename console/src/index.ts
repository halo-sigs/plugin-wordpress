import { definePlugin } from "@halo-dev/console-shared";
import WordPressView from "./views/WordPressView.vue";
import { markRaw } from "vue";
import MdiCogTransferOutline from "~icons/mdi/cog-transfer-outline";
import "./styles/tailwind.css";

export default definePlugin({
  name: "PluginWordPress",
  components: [],
  routes: [
    {
      parentName: "Root",
      route: {
        path: "/wordpress",
        children: [
          {
            path: "",
            name: "WordPress导入",
            component: WordPressView,
            meta: {
              title: "WordPress导入",
              searchable: true,
              menu: {
                name: "WordPress导入",
                group: "tool",
                icon: markRaw(MdiCogTransferOutline),
                priority: 0,
              },
            },
          },
        ],
      },
    },
  ],
  extensionPoints: {},
});
