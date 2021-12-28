import joplin from "api";
import * as chrono from "chrono-node";

joplin.plugins.register({
  onStart: async function () {
    joplin.workspace.onNoteChange(async (event: any) => {
      const args = ["notes", event.id];
      console.debug("Args", args);
      const note = await joplin.data.get(args, {
        fields: ["id", "title", "todo_due", "is_todo"],
      });
      console.debug("Event was triggered for note: ", event);
      console.debug("Queried note: ", note);

      // Exit early if todo date is set to avoid infinite loop
      // and surprising auto-updated relative times ie `tomorrow` changes every day
      if (note.todo_due) return;

      const date = chrono.parseDate(note.title);
      if (!date) return;

      console.debug("Discovered date: ", date, date.getTime());
      await joplin.data.put(["notes", note.id], null, {
        todo_due: date.getTime(),
      });
      console.info("Updated notes due date: ", note, date.getTime());
    });
  },
});
