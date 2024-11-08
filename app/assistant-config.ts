export let assistantId = "asst_FI5o9t475YZwxg1TOMTo2HsT"; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
