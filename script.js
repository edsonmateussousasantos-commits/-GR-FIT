
"use strict";

/* =====================================================
   GR FIT — SUA EVOLUÇÃO
   JavaScript principal + Supabase
===================================================== */

/* 1. CONEXÃO COM SUPABASE */

const SUPABASE_URL = "https://yfxopqarfalicrkwbyie.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_xDbuNBbZeFWurBCqNQMlBA_5MqLWbGN";

if (
  !window.supabase ||
  typeof window.supabase.createClient !== "function"
) {
  alert("Não foi possível carregar o Supabase. Verifique sua internet.");
  throw new Error("Biblioteca Supabase indisponível.");
}

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* 2. VARIÁVEIS */

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

let currentUser = null;
let currentProfile = null;

const PLANS = {
  mensal: { name: "Mensal", price: 29.90 },
  semestral: { name: "Semestral", price: 149.90 },
  anual: { name: "Anual", price: 249.90 }
};

const DASHBOARD_PAGES = [
  "professionalDashboard",
  "studentDashboard",
  "adminDashboard"
];

/* 3. MENSAGENS */

function showMessage(selector, message, type = "error") {
  const element = $(selector);

  if (!element) {
    console.warn(message);
    return;
  }

  element.textContent = message;
  element.className = "form-message " + type;
}

function clearMessage(selector) {
  const element = $(selector);

  if (!element) return;

  element.textContent = "";
  element.className = "form-message";
}

function setButtonLoading(button, loading, text) {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = text || "Aguarde...";
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || text || "Enviar";
  }
}

/* 4. NAVEGAÇÃO */


/* ==========================================
   4. NAVEGAÇÃO — GR FIT
========================================== */

function showPage(pageId) {
    const target = document.getElementById(pageId);

    if (!target) {
        console.warn("Página não encontrada:", pageId);
        return;
    }

    // Proteção das áreas restritas
    if (DASHBOARD_PAGES.includes(pageId)) {
        if (!currentUser || !currentProfile) {
            alert("Entre na sua conta para acessar esta área.");
            return;
        }

        const isAdminAuthorized =
            currentProfile.role === "admin" &&
            currentProfile.admin_access === true;

        const allowed = {
            professionalDashboard: [
                "profissional",
                ...(isAdminAuthorized ? ["admin"] : [])
            ],
            studentDashboard: ["aluno"],
            adminDashboard: isAdminAuthorized ? ["admin"] : []
        };

        if (!allowed[pageId]?.includes(currentProfile.role)) {
            alert("Sua conta não tem permissão para acessar esta área.");
            return;
        }
    }

    // Ativa somente a página selecionada
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    target.classList.add("active");

    // Identifica quando o usuário está em um painel
    document.body.classList.toggle(
        "dashboard-mode",
        target.classList.contains("dashboard-page")
    );

    // Fecha o menu público
    const navigation = document.getElementById("mainNavigation");
    const menuButton = document.querySelector(".header .menu-mobile");

    navigation?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");

    // Fecha também o seletor de temas
    document.getElementById("themeDropdown")
        ?.classList.remove("open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ABRIR E FECHAR MENU MOBILE */

function toggleMenu() {
    const navigation = document.getElementById("mainNavigation");
    const button = document.querySelector(".header .menu-mobile");

    if (!navigation || !button) return;

    const opened = navigation.classList.toggle("open");

    button.setAttribute("aria-expanded", String(opened));
    button.setAttribute(
        "aria-label",
        opened ? "Fechar menu" : "Abrir menu"
    );
}

/* 5. TEMAS */

function setTheme(theme) {
  const allowedThemes = ["blue", "dark", "light"];

  if (!allowedThemes.includes(theme)) {
    theme = "blue";
  }

  document.body.dataset.theme = theme;

  try {
    localStorage.setItem("grfit_theme", theme);
  } catch (error) {
    console.warn("Não foi possível salvar o tema.", error);
  }

  $$(".theme-options button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.theme === theme
    );
  });
}

function loadTheme() {
  let savedTheme = "blue";

  try {
    savedTheme = localStorage.getItem("grfit_theme") || "blue";
  } catch (error) {
    console.warn("Não foi possível recuperar o tema.", error);
  }

  setTheme(savedTheme);
}

/* 6. TERMOS */

function openTerms() {
  const modal = $("#termsModal");

  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeTerms() {
  const modal = $("#termsModal");

  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeTerms();
});

$("#termsModal")?.addEventListener("click", event => {
  if (event.target.id === "termsModal") closeTerms();
});

/* 7. PERFIL E AUTORIZAÇÃO */

async function getProfile(userId) {
    const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(
            "Erro ao consultar perfil: " + error.message
        );
    }

    if (!data) {
        throw new Error(
            "Perfil não encontrado. Verifique se existe um cadastro na tabela profiles para esta conta."
        );
    }

    return data;
}

async function checkUserRole(user, expectedRole) {
    const profile = await getProfile(user.id);

    if (profile.status !== "active") {
        throw new Error(
            "Sua conta não está ativa. Entre em contato com o suporte."
        );
    }

    const isAuthorizedAdmin =
        profile.role === "admin" &&
        profile.admin_access === true;

    const isProfessionalAccess =
        expectedRole === "profissional" &&
        isAuthorizedAdmin;

    if (expectedRole === "admin" && !isAuthorizedAdmin) {
        throw new Error("Seu acesso administrativo foi revogado.");
    }

    if (profile.role !== expectedRole && !isProfessionalAccess) {
        throw new Error("Esta conta não pertence à área selecionada.");
    }

    return profile;
}
async function checkAdminInvites() {
    if (!currentUser || currentProfile?.role !== "profissional") {
        return;
    }

    const { data, error } = await db.rpc("get_my_admin_invites");

    if (error) {
        console.error("Erro ao consultar convites:", error);
        return;
    }

    if (!data || data.length === 0) return;

    const dashboard = document.querySelector(
        "#professionalDashboard .dashboard-content"
    );

    if (!dashboard) return;

    document.querySelector("#adminInviteReceived")?.remove();

    const invite = data[0];

    const card = document.createElement("section");
    card.id = "adminInviteReceived";
    card.className = "panel-card";

    const title = document.createElement("h2");
    title.textContent = "Convite para administrador";

    const description = document.createElement("p");
    description.textContent =
        "Você recebeu um convite para fazer parte da administração da GR Fit.";

    const invitedBy = document.createElement("p");
    invitedBy.textContent =
        "Convite destinado a: " + invite.email;

    const permission = document.createElement("p");
    permission.textContent =
        "Permissão concedida: " + invite.permissions.join(", ");

    const acceptButton = document.createElement("button");
    acceptButton.className = "btn-primary";
    acceptButton.textContent = "Aceitar convite";

    const message = document.createElement("p");
    message.className = "form-message";

    acceptButton.addEventListener("click", async () => {
        acceptButton.disabled = true;
        acceptButton.textContent = "Validando convite...";

        try {
            const { data: accepted, error: acceptError } =
                await db.rpc("accept_admin_invite", {
                    p_code: invite.invite_code
                });

            if (acceptError) throw acceptError;
            if (accepted !== true) {
                throw new Error("Não foi possível aceitar o convite.");
            }

            message.textContent = "Convite aceito com sucesso!";
            message.classList.add("success");

            currentProfile = await getProfile(currentUser.id);

            setTimeout(() => {
                openUserDashboard(currentProfile);
            }, 700);

        } catch (error) {
            console.error("Erro ao aceitar convite:", error);
            message.textContent = error.message;
            message.classList.add("error");
            acceptButton.disabled = false;
            acceptButton.textContent = "Aceitar convite";
        }
    });

    card.append(
        title,
        description,
        invitedBy,
        permission,
        acceptButton,
        message
    );

    dashboard.prepend(card);
}

function openUserDashboard(profile) {
    if (!profile) return;

    currentProfile = profile;

    if (profile.role === "admin") {
        if (profile.admin_access !== true) {
            alert("Seu acesso administrativo foi revogado.");
            showPage("home");
            return;
        }

        showPage("adminDashboard");
        loadAdminDashboard();
        return;
    }

    if (profile.role === "profissional") {
        showPage("professionalDashboard");
        loadProfessionalDashboard();
        checkAdminInvites();
        return;
    }

    if (profile.role === "aluno") {
        showPage("studentDashboard");
        loadStudentDashboard();
        return;
    }

    alert("Tipo de conta não reconhecido.");
}
/* 8. CADASTRO PROFISSIONAL */

async function registerProfessional(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = event.submitter || form.querySelector('[type="submit"]');

  const name = $("#professionalName")?.value.trim() || "";
  const email = $("#registerEmail")?.value.trim() || "";
  const phone = $("#professionalPhone")?.value.trim() || "";
  const password = $("#registerPassword")?.value || "";
  const confirmation = $("#confirmPassword")?.value || "";
  const description = $("#professionalDescription")?.value.trim() || "";
  const specialty = $("#professionalSpecialty")?.value || "";
  const selectedPlan = $('input[name="plan"]:checked');
  const acceptedTerms = $("#acceptTerms")?.checked || false;

  clearMessage("#professionalMessage");

  if (!name || !email || !phone || !description || !specialty) {
    showMessage("#professionalMessage", "Preencha todos os campos.");
    return;
  }

  if (password !== confirmation) {
    showMessage("#professionalMessage", "As senhas não são iguais.");
    return;
  }

  if (password.length < 8) {
    showMessage(
      "#professionalMessage",
      "A senha precisa ter pelo menos 8 caracteres."
    );
    return;
  }

  if (!selectedPlan || !PLANS[selectedPlan.value]) {
    showMessage("#professionalMessage", "Selecione um plano.");
    return;
  }

  if (!acceptedTerms) {
    showMessage("#professionalMessage", "Aceite os termos para continuar.");
    return;
  }

  setButtonLoading(button, true, "Criando conta...");

  try {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: "profissional",
          phone,
          description,
          specialty,
          selected_plan: selectedPlan.value,
          terms_accepted: true
        }
      }
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("O Supabase não retornou os dados da conta.");
    }

    if (data.session) {
      const profile = await getProfile(data.user.id);

      if (
        profile.role !== "profissional" ||
        profile.status !== "active"
      ) {
        await db.auth.signOut();
        throw new Error("O perfil profissional não foi configurado corretamente.");
      }

      currentUser = data.user;
      currentProfile = profile;

      form.reset();

      showMessage(
        "#professionalMessage",
        "Conta criada! A ativação do plano depende da confirmação do pagamento.",
        "success"
      );

      setTimeout(() => openUserDashboard(profile), 900);
    } else {
      showMessage(
        "#professionalMessage",
        "Cadastro enviado! Confirme seu e-mail e depois entre na plataforma.",
        "success"
      );
    }

  } catch (error) {
    console.error("Cadastro profissional:", error);
    showMessage(
      "#professionalMessage",
      error.message || "Erro ao criar conta."
    );
  } finally {
    setButtonLoading(button, false, "Criar minha conta");
  }
}

/* 9. LOGIN PROFISSIONAL */

async function loginProfessional(event) {
  event.preventDefault();

  const button = event.submitter ||
    event.currentTarget.querySelector('[type="submit"]');

  const email = $("#professionalEmail")?.value.trim() || "";
  const password = $("#professionalPassword")?.value || "";

  clearMessage("#professionalLoginMessage");
  setButtonLoading(button, true, "Entrando...");

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const profile = await checkUserRole(data.user, "profissional");

    currentUser = data.user;
    currentProfile = profile;

    showMessage(
      "#professionalLoginMessage",
      "Login realizado com sucesso!",
      "success"
    );

    setTimeout(() => {
    if (profile.role === "admin") {
        showPage("professionalDashboard");
        loadProfessionalDashboard();
    } else {
        openUserDashboard(profile);
    }
}, 500);

  } catch (error) {
    console.error("Login profissional:", error);

    showMessage(
      "#professionalLoginMessage",
      error.message || "Não foi possível entrar."
    );

    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;

  } finally {
    setButtonLoading(button, false, "Entrar");
  }
}

/* 10. LOGIN ALUNO */

async function loginStudent(event) {
  event.preventDefault();

  const button = event.submitter ||
    event.currentTarget.querySelector('[type="submit"]');

  const email = $("#studentEmail")?.value.trim() || "";
  const password = $("#studentPassword")?.value || "";
  const code = $("#studentCode")?.value.trim() || "";

  clearMessage("#studentMessage");

  if (!code) {
    showMessage("#studentMessage", "Informe o código do profissional.");
    return;
  }

  setButtonLoading(button, true, "Verificando...");

  let authenticated = false;

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    authenticated = true;

    const profile = await checkUserRole(data.user, "aluno");

    const { data: result, error: inviteError } = await db.rpc(
      "redeem_invite_code",
      { p_code: code }
    );

    if (inviteError) {
      throw new Error("Erro ao validar código: " + inviteError.message);
    }

    if (
      result === false ||
      result === null ||
      (typeof result === "object" && result.success === false)
    ) {
      throw new Error("Código inválido, expirado ou indisponível.");
    }

    currentUser = data.user;
    currentProfile = profile;

    showMessage(
      "#studentMessage",
      "Acesso realizado e código validado!",
      "success"
    );

    setTimeout(() => openUserDashboard(profile), 500);

  } catch (error) {
    console.error("Login aluno:", error);

    showMessage("#studentMessage", error.message || "Não foi possível entrar.");

    if (authenticated) {
      await db.auth.signOut();
      currentUser = null;
      currentProfile = null;
    }

  } finally {
    setButtonLoading(button, false, "Entrar como aluno");
  }
}

/* 11. LOGIN ADMINISTRATIVO */

async function loginAdmin(event) {
  event.preventDefault();

  const button = event.submitter ||
    event.currentTarget.querySelector('[type="submit"]');

  const email = $("#adminEmail")?.value.trim() || "";
  const password = $("#adminPassword")?.value || "";

  clearMessage("#adminLoginMessage");
  setButtonLoading(button, true, "Verificando...");

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const profile = await checkUserRole(data.user, "admin");

    currentUser = data.user;
    currentProfile = profile;

    showMessage(
      "#adminLoginMessage",
      "Acesso administrativo autorizado.",
      "success"
    );

    setTimeout(() => openUserDashboard(profile), 500);

  } catch (error) {
    console.error("Login administrativo:", error);

    showMessage(
      "#adminLoginMessage",
      "Acesso não autorizado. " + error.message
    );

    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;

  } finally {
    setButtonLoading(button, false, "Entrar como administrador");
  }
}

/* 12. ABAS DOS PAINÉIS */

function showDashboardTab(tabId, button = null) {
  const target = document.getElementById(tabId);

  if (!target) return;

  const dashboard = target.closest(".dashboard");

  if (!dashboard) return;

  dashboard.querySelectorAll(".dashboard-tab").forEach(tab => {
    tab.classList.remove("active");
  });

  target.classList.add("active");

  dashboard.querySelectorAll(".side-link").forEach(link => {
    link.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  } else {
    dashboard.querySelectorAll(".side-link").forEach(link => {
      if (link.getAttribute("onclick")?.includes(tabId)) {
        link.classList.add("active");
      }
    });
  }
}

/* 13. FUNÇÕES DE EXIBIÇÃO SEGURA */

function createTextElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text ?? "";

  if (className) element.className = className;

  return element;
}

function renderEmpty(containerSelector, message) {
  const container = $(containerSelector);

  if (!container) return;

  container.replaceChildren(
    createTextElement("p", message, "empty-message")
  );
}

function formatDate(date) {
  if (!date) return "Não informado";

  return new Date(date).toLocaleDateString("pt-BR");
}

/* 14. PAINEL DO PROFISSIONAL */

async function loadProfessionalDashboard() {
  if (
    !currentUser ||
    !["profissional", "admin"].includes(currentProfile?.role)
) return;

  $("#professionalWelcome").textContent =
    "Olá, " + (currentProfile.full_name || "profissional");

  $("#professionalAccountEmail").textContent =
    currentUser.email || "";

  $("#professionalPlan").textContent =
    currentProfile.selected_plan || "Não identificado";

  $("#professionalSubscriptionStatus").textContent =
    currentProfile.subscription_status || "Não informado";

  await Promise.all([
    loadProfessionalStudents(),
    loadProfessionalWorkouts(),
    loadProfessionalAssessments()
  ]);
}
async function loadProfessionalStudents() {
    const container = $("#professionalStudentsList");

    if (!container || !currentUser) return;

    const { data, error } = await db
        .from("relationships")
        .select("student_id, created_at")
        .eq("professional_id", currentUser.id);

    if (error) {
        console.error("Erro ao carregar alunos:", error);
        renderEmpty(
            "#professionalStudentsList",
            "Não foi possível carregar os alunos."
        );
        return;
    }

    const relationships = data || [];

    $("#professionalStudentCount").textContent =
        relationships.length;

    if (!relationships.length) {
        renderEmpty(
            "#professionalStudentsList",
            "Nenhum aluno vinculado ainda."
        );
        return;
    }

    const ids = relationships.map(item => item.student_id);

    const { data: profiles, error: profileError } = await db
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

    if (profileError) {
        console.error("Erro ao consultar perfis dos alunos:", profileError);
        renderEmpty(
            "#professionalStudentsList",
            "Não foi possível carregar os perfis dos alunos."
        );
        return;
    }

    container.replaceChildren();

    (profiles || []).forEach(profile => {
        const card = document.createElement("article");
        card.className = "panel-card";

        card.append(
            createTextElement("h3", profile.full_name || "Aluno"),
            createTextElement("p", profile.email || "E-mail não informado")
        );

        container.append(card);
    });
}

async function loadProfessionalWorkouts() {
  const container = $("#professionalWorkoutsList");

  if (!container) return;

  const { data, error } = await db
    .from("workouts")
    .select("*")
    .eq("professional_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    renderEmpty("#professionalWorkoutsList", "Não foi possível carregar os treinos.");
    console.error(error);
    return;
  }

  const workouts = data || [];

  $("#professionalWorkoutCount").textContent = workouts.length;

  if (!workouts.length) {
    renderEmpty("#professionalWorkoutsList", "Você ainda não publicou treinos.");
    return;
  }

  container.replaceChildren();

  workouts.forEach(workout => {
    const card = document.createElement("article");
    card.className = "panel-card";

    card.append(
      createTextElement("h3", workout.name),
      createTextElement("p", workout.day_name || "Dia não informado"),
      createTextElement("p", workout.exercises || "")
    );

    if (workout.notes) {
      card.append(createTextElement("p", "Observações: " + workout.notes));
    }

    if (workout.video_url) {
      const link = document.createElement("a");
      link.href = workout.video_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir vídeo demonstrativo";
      card.append(link);
    }

    container.append(card);
  });
}

async function loadProfessionalAssessments() {
  const container = $("#professionalAssessmentsList");

  if (!container) return;

  const { data, error } = await db
    .from("assessments")
    .select("*")
    .eq("professional_id", currentUser.id)
    .order("assessment_date", { ascending: false });

  if (error) {
    renderEmpty("#professionalAssessmentsList", "Não foi possível carregar as avaliações.");
    console.error(error);
    return;
  }

  const assessments = data || [];

  $("#professionalAssessmentCount").textContent = assessments.length;

  if (!assessments.length) {
    renderEmpty("#professionalAssessmentsList", "Nenhuma avaliação registrada.");
    return;
  }

  container.replaceChildren();

  assessments.forEach(item => {
    const card = document.createElement("article");
    card.className = "panel-card";

    card.append(
      createTextElement("h3", "Avaliação — " + formatDate(item.assessment_date)),
      createTextElement("p", "Massa corporal: " + (item.mass_kg ?? "—") + " kg"),
      createTextElement("p", "Gordura corporal: " + (item.body_fat_pct ?? "—") + "%"),
      createTextElement("p", "Cintura: " + (item.waist_cm ?? "—") + " cm"),
      createTextElement("p", "Quadril: " + (item.hip_cm ?? "—") + " cm"),
      createTextElement("p", item.notes || "")
    );

    container.append(card);
  });
}

/* 15. PUBLICAR TREINO */

async function saveWorkout(event) {
  event.preventDefault();

  if (!currentUser ||!["profissional", "admin"].includes(currentProfile?.role)) {
    showMessage("#workoutMessage", "Acesso não autorizado.");
    return;
  }

  const form = event.currentTarget;
  const button = event.submitter || form.querySelector('[type="submit"]');

  const name = $("#workoutName")?.value.trim() || "";
  const day = $("#workoutDay")?.value.trim() || "";
  const studentId = $("#workoutStudent")?.value.trim() || "";
  const exercises = $("#workoutExercises")?.value.trim() || "";
  const video = $("#workoutVideo")?.value.trim() || "";
  const notes = $("#workoutNotes")?.value.trim() || "";

  clearMessage("#workoutMessage");

  if (!name || !exercises) {
    showMessage("#workoutMessage", "Informe o nome e os exercícios do treino.");
    return;
  }

  if (video && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(video)) {
    showMessage("#workoutMessage", "Informe um link válido do YouTube.");
    return;
  }

  setButtonLoading(button, true, "Publicando...");

  try {
    const workout = {
      professional_id: currentUser.id,
      name,
      day_name: day || null,
      exercises,
      video_url: video || null,
      notes: notes || null,
      published: true
    };

    if (studentId) {
      workout.student_id = studentId;
    }

    const { error } = await db
      .from("workouts")
      .insert(workout);

    if (error) throw error;

    form.reset();

    showMessage("#workoutMessage", "Treino publicado com sucesso!", "success");

    await loadProfessionalWorkouts();

  } catch (error) {
    console.error("Publicação de treino:", error);
    showMessage(
      "#workoutMessage",
      "Não foi possível publicar o treino: " + error.message
    );
  } finally {
    setButtonLoading(button, false, "Publicar treino");
  }
}

/* 16. SALVAR AVALIAÇÃO */

async function saveAssessment(event) {
  event.preventDefault();

  if (!currentUser || !["profissional", "admin"].includes(currentProfile?.role)) {
    showMessage("#assessmentMessage", "Acesso não autorizado.");
    return;
  }

  const form = event.currentTarget;
  const button = event.submitter || form.querySelector('[type="submit"]');

  const studentId = $("#assessmentStudent")?.value.trim() || "";

  if (!studentId) {
    showMessage("#assessmentMessage", "Informe o ID do aluno.");
    return;
  }

  const assessment = {
    student_id: studentId,
    professional_id: currentUser.id,
    assessment_date: new Date().toISOString().slice(0, 10),
    mass_kg: parseOptionalNumber("#assessmentMass"),
    body_fat_pct: parseOptionalNumber("#assessmentFat"),
    waist_cm: parseOptionalNumber("#assessmentWaist"),
    hip_cm: parseOptionalNumber("#assessmentHip"),
    notes: $("#assessmentNotes")?.value.trim() || null
  };

  if (Object.values(assessment).every(value => value === null)) {
    showMessage("#assessmentMessage", "Preencha pelo menos um dado da avaliação.");
    return;
  }

  setButtonLoading(button, true, "Salvando...");

  try {
    const { error } = await db
      .from("assessments")
      .insert(assessment);

    if (error) throw error;

    form.reset();

    showMessage("#assessmentMessage", "Avaliação salva com sucesso!", "success");

    await loadProfessionalAssessments();

  } catch (error) {
    console.error("Salvar avaliação:", error);
    showMessage(
      "#assessmentMessage",
      "Não foi possível salvar: " + error.message
    );
  } finally {
    setButtonLoading(button, false, "Salvar avaliação");
  }
}

function parseOptionalNumber(selector) {
  const value = $(selector)?.value.trim();

  if (value === undefined || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/* 17. GERAR CÓDIGO DE CONVITE */

async function generateInviteCode() {
  if (!currentUser || !["profissional", "admin"].includes(currentProfile?.role)) return;

  const button = $("#generateInviteButton");

  setButtonLoading(button, true, "Gerando código...");

  clearMessage("#inviteMessage");

  try {
    const { data, error } = await db.rpc("create_invite_code");

    if (error) throw error;

    let code = data;

    if (Array.isArray(data)) {
      code = data[0]?.code || data[0];
    } else if (typeof data === "object" && data !== null) {
      code = data.code;
    }

    if (!code || typeof code !== "string") {
      throw new Error("O banco não retornou um código válido.");
    }

    $("#professionalInviteCode").textContent = code;

    showMessage("#inviteMessage", "Código gerado com sucesso!", "success");

  } catch (error) {
    console.error("Gerar convite:", error);
    showMessage("#inviteMessage", error.message || "Não foi possível gerar o código.");
  } finally {
    setButtonLoading(button, false, "Gerar código de convite");
  }
}

/* 18. PAINEL DO ALUNO */

async function loadStudentDashboard() {
  if (!currentUser || currentProfile?.role !== "aluno") return;

  $("#studentWelcome").textContent =
    "Olá, " + (currentProfile.full_name || "aluno");

  $("#studentAccountEmail").textContent = currentUser.email || "";

  await Promise.all([
    loadStudentWorkouts(),
    loadStudentAssessments(),
    loadStudentProfessional()
  ]);
}

async function loadStudentWorkouts() {
  const container = $("#studentWorkoutsList");

  if (!container) return;

  const { data, error } = await db
    .from("workouts")
    .select("*")
    .eq("student_id", currentUser.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    renderEmpty("#studentWorkoutsList", "Não foi possível carregar os treinos.");
    console.error(error);
    return;
  }

  const workouts = data || [];

  $("#studentWorkoutCount").textContent = workouts.length;

  const { data: completions } = await db
    .from("workout_completions")
    .select("workout_id")
    .eq("student_id", currentUser.id);

  const completedIds = new Set(
    (completions || []).map(item => item.workout_id)
  );

  $("#studentCompletedCount").textContent = completedIds.size;

  if (!workouts.length) {
    renderEmpty("#studentWorkoutsList", "Nenhum treino individual disponível.");
    return;
  }

  container.replaceChildren();

  workouts.forEach(workout => {
    const card = document.createElement("article");
    card.className = "panel-card";

    card.append(
      createTextElement("h3", workout.name),
      createTextElement("p", workout.day_name || ""),
      createTextElement("p", workout.exercises || "")
    );

    if (workout.video_url) {
      const link = document.createElement("a");
      link.href = workout.video_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Assistir vídeo";
      card.append(link);
    }

    if (completedIds.has(workout.id)) {
      card.append(createTextElement("p", "Treino concluído", "success"));
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn-primary";
      button.textContent = "Marcar como concluído";
      button.addEventListener("click", () => completeWorkout(workout.id, button));
      card.append(button);
    }

    container.append(card);
  });
}

async function completeWorkout(workoutId, button) {
  if (!currentUser || currentProfile?.role !== "aluno") return;

  setButtonLoading(button, true, "Salvando...");

  try {
    const { error } = await db
      .from("workout_completions")
      .insert({
        workout_id: workoutId,
        student_id: currentUser.id
      });

    if (error) throw error;

    await loadStudentWorkouts();

  } catch (error) {
    console.error("Conclusão de treino:", error);
    alert("Não foi possível registrar a conclusão: " + error.message);
    setButtonLoading(button, false, "Marcar como concluído");
  }
}

async function loadStudentAssessments() {
  const container = $("#studentAssessmentsList");

  if (!container) return;

  const { data, error } = await db
    .from("assessments")
    .select("*")
    .eq("student_id", currentUser.id)
    .order("assessment_date", { ascending: false });

  if (error) {
    renderEmpty("#studentAssessmentsList", "Não foi possível carregar as avaliações.");
    console.error(error);
    return;
  }

  const assessments = data || [];

  $("#studentAssessmentCount").textContent = assessments.length;

  if (!assessments.length) {
    renderEmpty("#studentAssessmentsList", "Nenhuma avaliação disponível.");
    renderEmpty("#studentProgressList", "Ainda não existem registros de progresso.");
    return;
  }

  container.replaceChildren();

  assessments.forEach(item => {
    const card = document.createElement("article");
    card.className = "panel-card";

    card.append(
      createTextElement("h3", "Avaliação — " + formatDate(item.assessment_date)),
      createTextElement("p", "Massa corporal: " + (item.mass_kg ?? "—") + " kg"),
      createTextElement("p", "Gordura corporal: " + (item.body_fat_pct ?? "—") + "%"),
      createTextElement("p", "Cintura: " + (item.waist_cm ?? "—") + " cm"),
      createTextElement("p", "Quadril: " + (item.hip_cm ?? "—") + " cm"),
      createTextElement("p", item.notes || "")
    );

    container.append(card);
  });

  loadStudentProgress(assessments);
}

function loadStudentProgress(assessments) {
  const container = $("#studentProgressList");

  if (!container) return;

  container.replaceChildren();

  assessments.forEach(item => {
    const card = document.createElement("article");
    card.className = "panel-card";

    card.append(
      createTextElement("h3", formatDate(item.assessment_date)),
      createTextElement("p", "Massa corporal: " + (item.mass_kg ?? "—") + " kg"),
      createTextElement("p", "Gordura corporal: " + (item.body_fat_pct ?? "—") + "%")
    );

    container.append(card);
  });
}

async function loadStudentProfessional() {
  const container = $("#studentProfessionalInfo");

  if (!container) return;

  const { data: relationship, error } = await db
    .from("relationships")
    .select("professional_id")
    .eq("student_id", currentUser.id)
    .limit(1)
    .maybeSingle();

  if (error || !relationship) {
    container.textContent = "Nenhum profissional vinculado encontrado.";
    return;
  }

  const { data: professional, error: profileError } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", relationship.professional_id)
    .maybeSingle();

  if (profileError || !professional) {
    container.textContent = "Não foi possível consultar o profissional.";
    return;
  }

  container.replaceChildren(
    createTextElement("h3", professional.full_name || "Profissional"),
    createTextElement("p", professional.email || "")
  );
}
/* CONVITES ADMINISTRATIVOS */

async function createAdminInvite(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = event.submitter ||
        form.querySelector('[type="submit"]');

    const name = $("#adminInviteName")?.value.trim() || "";
    const email = $("#adminInviteEmail")?.value.trim() || "";
    const permission = $("#adminInvitePermissions")?.value || "";

    clearMessage("#adminInviteMessage");

    if (!currentUser || currentProfile?.role !== "admin") {
        showMessage(
            "#adminInviteMessage",
            "Apenas administradores podem criar convites."
        );
        return;
    }

    if (!name || !email || !permission) {
        showMessage(
            "#adminInviteMessage",
            "Preencha todos os campos."
        );
        return;
    }

    setButtonLoading(button, true, "Criando convite...");

    try {
        const { data: code, error } = await db.rpc(
            "create_admin_invite",
            {
                p_email: email,
                p_name: name,
                p_permissions: [permission],
                p_message: null
            }
        );

        if (error) throw error;

        if (!code) {
            throw new Error("O Supabase não retornou o código.");
        }

        showMessage(
            "#adminInviteMessage",
            "Convite criado com sucesso! Código: " + code,
            "success"
        );

        const container = $("#adminInvitesList");

        if (container) {
            const card = document.createElement("article");
            card.className = "panel-card";

            const title = document.createElement("h3");
            title.textContent = name;

            const emailText = document.createElement("p");
            emailText.textContent = "E-mail: " + email;

            const permissionText = document.createElement("p");
            permissionText.textContent =
                "Permissão: " + permission;

            const codeText = document.createElement("p");
            codeText.textContent = "Código: " + code;

            card.append(
                title,
                emailText,
                permissionText,
                codeText
            );

            container.prepend(card);
        }

        form.reset();

    } catch (error) {
        console.error("Erro ao criar convite administrativo:", error);

        showMessage(
            "#adminInviteMessage",
            error.message || "Não foi possível criar o convite."
        );

    } finally {
        setButtonLoading(button, false, "Criar convite");
    }
}

/* 19. PAINEL ADMINISTRATIVO */

async function loadAdminDashboard() {
    const MAIN_ADMIN_EMAIL = "suportes.grfit@gmail.com";

    if (
        !currentUser ||
        currentProfile?.role !== "admin" ||
        currentProfile?.admin_access !== true
    ) return;

    const isMainAdmin =
        (currentUser.email || "").toLowerCase() === MAIN_ADMIN_EMAIL;

    $("#adminWelcome").textContent =
        "Olá, " + (currentProfile.full_name || "administrador");

    const { data: profiles, error } = await db
        .from("profiles")
        .select(`
            id,
            role,
            full_name,
            email,
            status,
            admin_access,
            admin_original_role
        `)
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Erro ao carregar painel:", error);
        renderEmpty("#adminTeamList", "Não foi possível carregar os usuários.");
        return;
    }

    const users = profiles || [];
    const admins = users.filter(user =>
    user.role === "admin" && user.admin_access === true
);

    $("#adminUserCount").textContent = users.length;
    $("#adminProfessionalCount").textContent =
        users.filter(user => user.role === "profissional").length;
    $("#adminStudentCount").textContent =
        users.filter(user => user.role === "aluno").length;

    // Consultar convites aceitos
    let acceptedInvites = [];

    if (isMainAdmin) {
        const { data, error: inviteError } = await db.rpc(
            "get_accepted_admin_invites"
        );

        if (inviteError) {
            console.error("Erro ao consultar convites aceitos:", inviteError);
            alert("Não foi possível consultar os convites aceitos.");
        } else {
            acceptedInvites = data || [];
        }
    }

    const acceptedUserIds = new Set(
        acceptedInvites.map(invite => invite.accepted_by)
    );

    // Lista de administradores e pessoas que aceitaram convite
    const adminContainer = $("#adminTeamList");

    if (adminContainer) {
        adminContainer.replaceChildren();

        const managedUsers = users.filter(user => {
            const isActiveAdmin =
                user.role === "admin" &&
                user.admin_access === true;

            const isAcceptedCandidate =
                acceptedUserIds.has(user.id) &&
                ["aluno", "profissional"].includes(user.role);

            return isActiveAdmin || isAcceptedCandidate;
        });

        if (!managedUsers.length) {
            renderEmpty(
                "#adminTeamList",
                "Nenhum administrador ou convite aceito encontrado."
            );
        }

        managedUsers.forEach(user => {
            const isMainAccount =
                (user.email || "").toLowerCase() === MAIN_ADMIN_EMAIL;

            const isAdmin =
                user.role === "admin" &&
                user.admin_access === true;

            const hasAcceptedInvite =
                acceptedUserIds.has(user.id);

            const card = document.createElement("article");
            card.className = "panel-card";

            card.append(
                createTextElement("h3", user.full_name || "Usuário"),
                createTextElement("p", user.email || "E-mail não informado"),
                createTextElement(
                    "p",
                    isMainAccount
                        ? "Administrador principal"
                        : isAdmin
                            ? "Administrador autorizado"
                            : "Convite administrativo aceito"
                ),
                createTextElement(
                    "p",
                    "Status: " + (user.status || "Não informado")
                )
            );

            // A conta principal não pode ser modificada
            if (isMainAdmin && !isMainAccount) {

                // REMOVER ADM
                if (isAdmin) {
                    const removeButton = document.createElement("button");

                    removeButton.type = "button";
                    removeButton.className = "btn-danger";
                    removeButton.textContent = "Remover ADM";

                    
                    removeButton.addEventListener("click", async () => {
                    console.log("1. BOTÃO CLICADO:", user.id);

                    const confirmado = confirm(
                     "Deseja remover o acesso administrativo de " +
                      (user.full_name || user.email) + "?"
                    );

                    if (!confirmado) {
                      console.log("2. OPERAÇÃO CANCELADA");
                     return;
                    }

                    console.log("2. CONFIRMAÇÃO ACEITA");

                    removeButton.disabled = true;
                    removeButton.textContent = "Removendo...";

                   try {
                   console.log("3. CHAMANDO SUPABASE");

                     const { data, error } = await db.rpc(
                     "remove_admin_access",
                     { p_target_id: user.id }
                     );

                   console.log("4. RESPOSTA DO SUPABASE:", data);
                   console.log("5. ERRO DO SUPABASE:", error);

                   if (error) throw error;

                    if (data !== true) {
                    throw new Error("O banco não confirmou a remoção.");
                    }

                    alert("Acesso administrativo removido!");
                    await loadAdminDashboard();

                    } catch (error) {
                    console.error("ERRO AO REMOVER ADM:", error);

                    alert("Falha ao remover ADM: " + error.message);
                    }
                   finally {
                   removeButton.disabled = false;
        
                   removeButton.textContent = "Remover ADM";
                    }
                });

                    card.append(removeButton);
                }

                // HABILITAR ADM
                if (
                    !isAdmin &&
                    hasAcceptedInvite &&
                    user.status === "active"
                ) {
                    const enableButton = document.createElement("button");

                    enableButton.type = "button";
                    enableButton.className = "btn-success";
                    enableButton.textContent = "Habilitar ADM";

                    enableButton.addEventListener("click", async () => {
                        if (!confirm(
                            "Deseja habilitar o acesso administrativo de " +
                            (user.full_name || user.email) + "?"
                        )) return;

                        enableButton.disabled = true;
                        enableButton.textContent = "Habilitando...";

                        try {
                            const { data, error } = await db.rpc(
                                "enable_admin_access",
                                { p_target_id: user.id }
                            );

                            if (error) throw error;
                            if (data !== true) {
                                throw new Error("O banco não confirmou a habilitação.");
                            }

                            alert("Acesso administrativo habilitado!");
                            await loadAdminDashboard();

                        } catch (error) {
                            console.error(error);
                            alert("Erro ao habilitar ADM: " + error.message);

                            enableButton.disabled = false;
                            enableButton.textContent = "Habilitar ADM";
                        }
                    });

                    card.append(enableButton);
                }

                // BANIR CONTA
                if (user.status !== "banned") {
                    const banButton = document.createElement("button");

                    banButton.type = "button";
                    banButton.className = "btn-danger";
                    banButton.textContent = "Banir conta";

                    banButton.addEventListener("click", async () => {
                        if (!confirm(
                            "ATENÇÃO: deseja banir esta conta da GR Fit? " +
                            "O usuário perderá o acesso à plataforma."
                        )) return;

                        banButton.disabled = true;
                        banButton.textContent = "Banindo...";

                        try {
                            const { data, error } = await db.rpc(
                                "ban_grfit_user",
                                { p_target_id: user.id }
                            );

                            if (error) throw error;
                            if (data !== true) {
                                throw new Error("O banco não confirmou o banimento.");
                            }

                            alert("Conta banida.");
                            await loadAdminDashboard();

                        } catch (error) {
                            console.error(error);
                            alert("Erro ao banir conta: " + error.message);

                            banButton.disabled = false;
                            banButton.textContent = "Banir conta";
                        }
                    });

                    card.append(banButton);
                } else {
                    card.append(
                        createTextElement("p", "Esta conta está banida.")
                    );
                }
            }

            adminContainer.append(card);
        });
    }

    renderEmpty(
        "#adminUsersList",
        "A listagem detalhada de usuários será implementada."
    );

    renderEmpty(
        "#adminInvitesList",
        "Os convites aceitos aparecem na equipe administrativa."
    );

    renderEmpty(
        "#adminSubscriptionsList",
        "A gestão de assinaturas será implementada."
    );

    renderEmpty(
        "#adminSupportList",
        "A área de suporte será implementada."
    );

    renderEmpty(
        "#adminAuditList",
        "O histórico de auditoria será implementado."
    );
    


  
    
  }
/* 20. SAIR */

async function logout() {
    try {
        const { data } = await db.auth.getSession();

        if (data.session) {
            const { error } = await db.auth.signOut();

            if (
                error &&
                !error.message.toLowerCase().includes("session_not_found")
            ) {
                throw error;
            }
        }

        currentUser = null;
        currentProfile = null;

        showPage("home");

    } catch (error) {
        console.error("Erro ao sair:", error);

        currentUser = null;
        currentProfile = null;

        showPage("home");
    }
}
/* 21. RECUPERAR SESSÃO */

async function initializeSession() {
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    const user = data.session?.user || null;

    if (!user) {
      currentUser = null;
      currentProfile = null;
      showPage("home");
      return;
    }

    const profile = await getProfile(user.id);

    if (profile.status !== "active") {
      await db.auth.signOut();

      currentUser = null;
      currentProfile = null;

      showPage("home");

      alert("Sua conta não está ativa. Entre em contato com o suporte.");
      return;
    }

    currentUser = user;
    currentProfile = profile;

    openUserDashboard(profile);

  } catch (error) {
    console.error("Erro ao recuperar sessão:", error);

    currentUser = null;
    currentProfile = null;

    showPage("home");
  }
}

/* 22. MONITORAR AUTENTICAÇÃO */

db.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;

  console.log("Autenticação:", event);
});

/* 23. MENU DE TEMAS */

function toggleThemeMenu() {
  const dropdown = document.getElementById("themeDropdown");

  if (dropdown) {
    dropdown.classList.toggle("open");
  }
}

document.addEventListener("click", function(event) {
  const menu = document.querySelector(".theme-menu");
  const dropdown = document.getElementById("themeDropdown");

  if (menu && dropdown && !menu.contains(event.target)) {
    dropdown.classList.remove("open");
  }
});

/* =========================================
   ABERTURA CINEMATOGRÁFICA GR FIT
========================================= */

function startCinematicIntro() {

    const intro = document.getElementById("grfitIntro");

    if (!intro) return;

    const shouldShow =
        document.documentElement.classList.contains(
            "grfit-intro-enabled"
        );

    if (!shouldShow) {
        intro.remove();
        return;
    }

    // Respeita quem prefere animações reduzidas.
    if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        try {
         
        } catch (error) {}

        document.documentElement.classList.remove(
            "grfit-intro-enabled"
        );

        intro.remove();
        return;
    }

    // Registra a apresentação nesta sessão.
    try {
       
    } catch (error) {
        console.warn("Não foi possível salvar a sessão.");
    }

    document.body.classList.add("intro-active");

    let finished = false;

    function finishIntro() {

        if (finished) return;

        finished = true;

        intro.classList.add("is-leaving");

        setTimeout(() => {

            intro.remove();

            document.body.classList.remove("intro-active");

            document.documentElement.classList.remove(
                "grfit-intro-enabled"
            );

        }, 700);
    }

    // Botão para pular a apresentação.
    document.getElementById("skipIntro")
        ?.addEventListener("click", finishIntro);

    // Encerramento automático.
    setTimeout(finishIntro, 3400);
}
/* 24. CONECTAR FORMULÁRIOS */

document.addEventListener("DOMContentLoaded", async () => {

  loadTheme();
startCinematicIntro();
  $("#professionalForm")?.addEventListener("submit", registerProfessional);
  $("#professionalLoginForm")?.addEventListener("submit", loginProfessional);
  $("#studentForm")?.addEventListener("submit", loginStudent);
  $("#adminLoginForm")?.addEventListener("submit", loginAdmin);
  $("#adminInviteForm")?.addEventListener(
    "submit",
    createAdminInvite
);
  $("#workoutForm")?.addEventListener("submit", saveWorkout);
  $("#assessmentForm")?.addEventListener("submit", saveAssessment);
  $("#generateInviteButton")?.addEventListener("click", generateInviteCode);

  await initializeSession();

  console.log("GR Fit inicializada.");
});

/* ==========================================
   GR FIT — MENU COMPACTO DOS DASHBOARDS
========================================== */

function toggleDashboardMenu(button) {
    const dashboard = button.closest(".dashboard");

    if (!dashboard) return;

    const isOpen = dashboard.classList.toggle("menu-open");

    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute(
        "aria-label",
        isOpen ? "Fechar menu" : "Abrir menu"
    );
}

// Fecha o menu depois de selecionar uma opção
document.addEventListener("click", function(event) {
    const selectedLink = event.target.closest(
        ".dashboard-sidebar .side-link"
    );

    if (!selectedLink) return;

    const dashboard = selectedLink.closest(".dashboard");
    if (!dashboard) return;

    dashboard.classList.remove("menu-open");

    const button = dashboard.querySelector(
        ".dashboard-menu-toggle"
    );

    button?.setAttribute("aria-expanded", "false");
    button?.setAttribute("aria-label", "Abrir menu");
});
