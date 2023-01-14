import joplin from "api";
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';
import * as chrono from "chrono-node";
import {debounce} from "lodash";

const autoAlarmUpdate = async (noteId: string, forceUpdate: boolean) => {
  const args = ["notes", noteId];
  console.debug("Args", args);
  const note = await joplin.data.get(args, {
    fields: ["id", "title", "todo_due", "is_todo"],
  });
  console.debug("Event was triggered for note: ", note.id);
  console.debug("Queried note: ", note);

  // Exit early if todo date is set to avoid infinite loop
  // and surprising auto-updated relative times ie `tomorrow` changes every day
  if (note.todo_due && !forceUpdate) return;

  const date = chrono.parseDate(note.title);

  // No date and force update, set to 0
  if (!date && forceUpdate) {
    await joplin.data.put(["notes", note.id], null, {
      todo_due: 0,
    });

    return;
  }

  if (!date) return;

  console.debug("Discovered date: ", date, date.getTime());
  await joplin.data.put(["notes", note.id], null, {
    todo_due: date.getTime(),
  });
  console.info("Updated notes due date: ", note, date.getTime());
};

const debouncedAlarmUpdate = debounce((id: string) => autoAlarmUpdate(id, false), 1000, {trailing: true, leading: false})

joplin.plugins.register({
  onStart: async function () {
    await joplin.commands.register({
      name: "autoAlarmUpdate",
      label: "Update auto alarm",
      execute: async (_noteIds: string[]) => {
        const note = await joplin.workspace.selectedNote();
        console.info("autoAlarmUpdate called with ", note.id);
        await autoAlarmUpdate(note.id, true);
      },
    });

    joplin.workspace.onNoteChange(async (event: any) => {
      // Inlined because of definition difficulties
      enum ItemChangeEventType {
        Create = 1,
        Update = 2,
        Delete = 3,
      }

      console.info("autoAlarm called for onNoteChange", event, ItemChangeEventType.Update);
      if (event.event != ItemChangeEventType.Update) return;
      // Wait until DELAY since last time event was sent to improve odds that full content is in TITLE
      await debouncedAlarmUpdate(event.id)
    });

    // add accelerator
		await joplin.views.toolbarButtons.create('autoAlarmViaToolbarButtons', 'autoAlarmUpdate', ToolbarButtonLocation.EditorToolbar);

		await joplin.views.menuItems.create('autoAlarmViaMenuItems', 'autoAlarmUpdate', MenuItemLocation.EditorContextMenu, { accelerator: "Ctrl+Shift+M" });

		await joplin.views.menus.create('autoAlarmViaMenu', 'Auto alarm update', [
			{
				commandName: "autoAlarmUpdate",
				accelerator: "Ctrl+Shift+m"
			}
		]);
  },
});
