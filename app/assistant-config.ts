export let assistantId = "asst_GadqNiAaAVnUQ6VYElKcd42h"; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
