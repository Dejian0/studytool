import os
from pathlib import Path

import streamlit as st

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from lib.ai import analyze_exams, build_messages, encode_images, stream_chat
from lib.latex import convert_latex_delimiters
from lib.filesystem import (
    create_course,
    ensure_base_dirs,
    get_file_path,
    list_courses,
    list_files,
    list_prompts,
    read_prompt,
    save_notes,
    save_uploaded_file,
    write_prompt,
)
from lib.pdf_viewer import get_page_count, render_pages

st.set_page_config(page_title="AI Study Helper", layout="wide")

ensure_base_dirs()

MODELS = {
    "GPT-5.2": "gpt-5.2",
    "GPT-5 mini": "gpt-5-mini",
    "GPT-5 nano": "gpt-5-nano",
    "GPT-4o": "gpt-4o",
}

# ---------------------------------------------------------------------------
# Session state defaults
# ---------------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []
if "ctx_course" not in st.session_state:
    st.session_state.ctx_course = None
if "ctx_pdf" not in st.session_state:
    st.session_state.ctx_pdf = None

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    # -- OpenAI configuration -------------------------------------------------
    st.header("OpenAI")

    env_key = os.environ.get("OPENAI_API_KEY", "")
    api_key = st.text_input(
        "API Key",
        value=env_key,
        type="password",
        placeholder="sk-…",
    )

    model_label = st.selectbox("Model", list(MODELS.keys()), index=3)
    selected_model = MODELS[model_label]

    st.divider()

    # -- Course Manager -------------------------------------------------------
    st.header("Course Manager")

    courses = list_courses()
    selected_course = st.selectbox(
        "Select course",
        courses,
        index=0 if courses else None,
        placeholder="No courses yet",
    )

    with st.expander("Create new course"):
        new_name = st.text_input("Course name")
        if st.button("Create", disabled=not new_name):
            create_course(new_name.strip())
            st.success(f"Created **{new_name.strip()}**")
            st.rerun()

    if selected_course:
        with st.expander("Upload files"):
            target_folder = st.radio(
                "Destination",
                ["slides", "exams"],
                horizontal=True,
                key="upload_dest",
            )
            uploaded = st.file_uploader(
                "Choose PDFs",
                type=["pdf"],
                accept_multiple_files=True,
                key="file_uploader",
            )
            if uploaded and st.button("Upload"):
                for f in uploaded:
                    save_uploaded_file(selected_course, target_folder, f.name, f.read())
                st.success(f"Uploaded {len(uploaded)} file(s) to **{selected_course}/{target_folder}/**")
                st.rerun()

    st.divider()

    # -- Prompt Manager -------------------------------------------------------
    st.header("Prompt Manager")
    prompts = list_prompts()

    if prompts:
        selected_prompt = st.selectbox("Select prompt", prompts, key="sidebar_prompt")
        prompt_content = read_prompt(selected_prompt)
        edited = st.text_area("Edit prompt", value=prompt_content, height=200)
        if st.button("Save prompt"):
            write_prompt(selected_prompt, edited)
            st.success(f"Saved **{selected_prompt}**")
    else:
        st.info("No prompt files found in prompts/")

    st.divider()

    # -- Exam Analyzer --------------------------------------------------------
    st.header("Exam Analyzer")

    exam_disabled = (not api_key) or (not courses) or (not selected_course)
    if st.button("Analyze exams", disabled=exam_disabled):
        exam_pdfs = list_files(selected_course, "exams", ".pdf")
        if not exam_pdfs:
            st.warning("No PDFs found in the exams/ folder.")
        else:
            with st.spinner("Analyzing exams…"):
                all_images: list[bytes] = []
                for pdf_name in exam_pdfs:
                    path = get_file_path(selected_course, "exams", pdf_name)
                    count = get_page_count(path)
                    all_images.extend(render_pages(path, 1, count))

                analyzer_prompt = read_prompt("exam_analyzer.txt")
                result = analyze_exams(
                    api_key, selected_model, analyzer_prompt, all_images
                )
                save_notes(selected_course, "priorities.md", result)
            st.success("Saved to notes/priorities.md")

    if not api_key:
        st.caption("Enter an API key to enable.")

# ---------------------------------------------------------------------------
# Reset chat when context changes
# ---------------------------------------------------------------------------
if courses and selected_course:
    if st.session_state.ctx_course != selected_course:
        st.session_state.ctx_course = selected_course
        st.session_state.messages = []

# ---------------------------------------------------------------------------
# Main area -- two-column split
# ---------------------------------------------------------------------------
if not courses:
    st.info("Create a course in the sidebar to get started.")
    st.stop()

left_col, right_col = st.columns(2)

# ---- Left column: PDF Viewer ------------------------------------------------
with left_col:
    st.subheader("Slide Viewer")

    pdf_files = list_files(selected_course, "slides", ".pdf")

    if not pdf_files:
        st.info(f"No PDFs in **{selected_course}/slides/**. Drop some in to begin.")
    else:
        chosen_pdf = st.selectbox("Select PDF", pdf_files, key="pdf_select")

        if st.session_state.ctx_pdf != chosen_pdf:
            st.session_state.ctx_pdf = chosen_pdf
            st.session_state.messages = []

        pdf_path = get_file_path(selected_course, "slides", chosen_pdf)
        total_pages = get_page_count(pdf_path)

        p1, p2 = st.columns(2)
        with p1:
            start_page = st.number_input(
                "Start page", min_value=1, max_value=total_pages, value=1
            )
        with p2:
            end_page = st.number_input(
                "End page",
                min_value=1,
                max_value=total_pages,
                value=min(5, total_pages),
            )

        if start_page > end_page:
            st.warning("Start page must be <= End page.")
        else:
            images = render_pages(pdf_path, start_page, end_page)
            for idx, img_bytes in enumerate(images):
                st.image(
                    img_bytes,
                    caption=f"Page {start_page + idx}",
                    use_container_width=True,
                )

# ---- Right column: AI Hub ---------------------------------------------------
with right_col:
    st.subheader("AI Hub")

    hub_prompts = list_prompts()
    active_prompt = st.selectbox(
        "System prompt",
        hub_prompts,
        key="hub_prompt",
    )

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(convert_latex_delimiters(msg["content"]))

    if not api_key:
        st.warning("Enter your OpenAI API key in the sidebar to start chatting.")
    elif not pdf_files:
        st.info("Select a PDF on the left to provide context for the chat.")
    elif user_input := st.chat_input("Ask about the slides…"):
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        context_images = render_pages(pdf_path, start_page, end_page)
        image_blocks = encode_images(context_images)

        system_text = read_prompt(active_prompt)
        api_messages = build_messages(
            system_text, st.session_state.messages[:-1], user_input, image_blocks
        )

        with st.chat_message("assistant"):
            placeholder = st.empty()
            full_response = ""
            for chunk in stream_chat(api_key, selected_model, api_messages):
                full_response += chunk
                placeholder.markdown(convert_latex_delimiters(full_response))

        st.session_state.messages.append(
            {"role": "assistant", "content": full_response}
        )
