export let assistantId = "asst_s51zbYwTXKhsmOFuzPlGLpAF"; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
