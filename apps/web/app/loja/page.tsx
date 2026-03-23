"use client";

import { Gem, ShieldPlus, Sparkles } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { equipProfileItemAuthed, fetchProfileInventoryAuthed, fetchShopAuthed, purchaseShopItemAuthed } from "@/lib/api";
import { fallbackProfileInventory, fallbackShopData, ProfileInventory, ShopData, ShopItem } from "@/lib/data";

function rarityLabel(rarity: ShopItem["rarity"]) {
  if (rarity === "epico") return "Epico";
  if (rarity === "raro") return "Raro";
  return "Comum";
}

function categoryLabel(category: ShopItem["category"]) {
  if (category === "avatar") return "Avatares";
  if (category === "frame") return "Molduras";
  if (category === "theme") return "Temas";
  return "Power-ups";
}

export default function LojaPage() {
  const { ready, token, user, updateUser, setActiveTheme, activeTheme } = useAuth();
  const [shop, setShop] = useState<ShopData>(fallbackShopData);
  const [inventory, setInventory] = useState<ProfileInventory>(fallbackProfileInventory);
  const [message, setMessage] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    fetchShopAuthed(token, user.id).then(setShop).catch(() => setShop(fallbackShopData));
    fetchProfileInventoryAuthed(token, user.id).then(setInventory).catch(() => setInventory(fallbackProfileInventory));
  }, [token, user]);

  useEffect(() => {
    const equippedTheme = inventory.items.find((item) => item.category === "theme" && item.equipped);
    if (equippedTheme && activeTheme !== equippedTheme.id) {
      setActiveTheme(equippedTheme.id);
    }
  }, [activeTheme, inventory.items, setActiveTheme]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShopItem[]> = { avatar: [], frame: [], theme: [], powerup: [] };
    for (const item of shop.items) {
      groups[item.category].push(item);
    }
    return groups;
  }, [shop.items]);

  async function handlePurchase(itemId: string) {
    if (!token || !user) {
      setMessage("Sessao indisponivel para concluir a compra.");
      return;
    }
    setBuyingId(itemId);
    setMessage(null);
    try {
      const nextShop = await purchaseShopItemAuthed(token, user.id, itemId);
      setShop(nextShop);
      const nextInventory = await fetchProfileInventoryAuthed(token, user.id);
      setInventory(nextInventory);
      setMessage(user.role === "student" ? "Compra concluida. O item ja foi para seu inventario." : "Item liberado para uso no seu inventario.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.");
    } finally {
      setBuyingId(null);
    }
  }

  async function handleEquip(item: ShopItem) {
    if (!token || !user) {
      setMessage("Sessao indisponivel para equipar este item.");
      return;
    }
    setEquippingId(item.id);
    setMessage(null);
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, item.id);
      setInventory(nextInventory);
      if (item.category === "avatar") {
        const nextAvatar = nextInventory.items.find((inventoryItem) => inventoryItem.id === item.id)?.asset_url;
        if (nextAvatar) {
          updateUser({ ...user, avatar_url: nextAvatar });
        }
        setMessage("Avatar equipado com sucesso.");
      } else if (item.category === "theme") {
        setActiveTheme(item.id);
        setMessage("Tema aplicado na plataforma.");
      } else {
        setMessage("Item ativado com sucesso.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel equipar este item.");
    } finally {
      setEquippingId(null);
    }
  }

  function isEquipped(item: ShopItem) {
    if (item.category === "theme") {
      return activeTheme === item.id;
    }
    return inventory.items.some((inventoryItem) => inventoryItem.id === item.id && inventoryItem.equipped);
  }

  if (!ready) {
    return null;
  }

  if (user?.role !== "student") {
    return (
      <PlatformShell
        heading="Loja MatGo"
        description="A loja fica ativa apenas para alunos."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Professor</span>
              <h2>Loja desativada para professor</h2>
              <p>Como o professor ja tem acesso liberado aos itens de trabalho, essa area fica reservada para a experiencia do aluno.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Loja MatGo"
      description="Itens compraveis para alunos e catalogo totalmente liberado para professores e master."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Saldo</span>
            <h2>{user?.role === "student" ? "Suas moedas e compras" : "Catalogo liberado para professor"}</h2>
            <p>
              {user?.role === "student"
                ? "Compre avatares, temas e power-ups para levar a identidade da MatGo para o seu perfil."
                : "Professor e master podem usar todos os itens da loja sem depender de recompensa ou compra."}
            </p>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{shop.coins_balance}</strong>
              <span>moedas disponiveis</span>
            </div>
            <div>
              <strong>{shop.items.filter((item) => item.owned).length}</strong>
              <span>itens liberados</span>
            </div>
            <div>
              <strong>{shop.items.length}</strong>
              <span>itens no catalogo</span>
            </div>
            <div>
              <strong>{user?.role === "student" ? "compra" : "acesso total"}</strong>
              <span>modo da loja</span>
            </div>
          </div>
          {message ? <div className="feedback-box">{message}</div> : null}
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Regra</span>
            <h2>Como a loja funciona</h2>
            <p>Aluno compra com moedas. Professor e master entram com tudo liberado para usar no sistema e no backend.</p>
          </div>
          <div className="tag-row">
            <span className="tag"><Gem size={14} /> compras com moedas</span>
            <span className="tag success"><Sparkles size={14} /> itens vao para o inventario</span>
            <span className="tag warning"><ShieldPlus size={14} /> professor usa tudo</span>
          </div>
        </article>
      </section>

      {(["avatar", "frame", "theme", "powerup"] as const).map((category) => (
        <section key={category} className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Categoria</span>
              <h2>{categoryLabel(category)}</h2>
              <p>Escolha com calma. Itens comprados ficam liberados no inventario do perfil.</p>
            </div>
            <div className="shop-grid">
              {groupedItems[category].map((item) => (
                <div key={item.id} className={`shop-item-card ${item.owned ? "owned" : ""}`}>
                  <div className="shop-item-top">
                    {item.category === "avatar" ? (
                      <img alt={item.name} className="avatar-option-image" src={item.asset_url} />
                    ) : item.category === "frame" ? (
                      <div className={`profile-frame-preview profile-card-frame ${item.asset_url}`}>
                        <div className="profile-frame-preview-content">
                          <strong>{item.name}</strong>
                          <small>Skin do card</small>
                        </div>
                      </div>
                    ) : (
                      <div className="shop-item-symbol">{item.category === "theme" ? "T" : "P"}</div>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                  <div className="tag-row">
                    <span className={`tag ${item.rarity === "epico" ? "highlight" : item.rarity === "raro" ? "warning" : ""}`}>{rarityLabel(item.rarity)}</span>
                    <span className="tag">{item.price > 0 ? `${item.price} moedas` : "gratuito"}</span>
                    {isEquipped(item) ? <span className="tag success">Em uso</span> : null}
                  </div>
                  <small className="shop-item-hint">
                    {item.category === "theme"
                      ? "Temas mudam a atmosfera visual da plataforma e ajudam a diferenciar a experiencia do aluno."
                      : item.unlock_hint}
                  </small>
                  <div className="shop-item-actions">
                    {item.owned ? (
                      item.category === "powerup" ? (
                        <button className="secondary-button" type="button">Ja no inventario</button>
                      ) : (
                        <button className="secondary-button" disabled={equippingId === item.id || isEquipped(item)} onClick={() => handleEquip(item)} type="button">
                          {equippingId === item.id ? "Aplicando..." : isEquipped(item) ? "Em uso" : item.category === "theme" ? "Usar tema" : "Equipar item"}
                        </button>
                      )
                    ) : user?.role === "student" ? (
                      <button
                        className="primary-button"
                        disabled={!item.can_purchase || buyingId === item.id}
                        onClick={() => handlePurchase(item.id)}
                        type="button"
                      >
                        {buyingId === item.id ? "Comprando..." : item.can_purchase ? "Comprar item" : "Moedas insuficientes"}
                      </button>
                    ) : (
                      <div className="inline-metrics">
                        <button className="secondary-button" onClick={() => handlePurchase(item.id)} type="button">
                          Liberar no inventario
                        </button>
                        {item.owned && item.category !== "powerup" ? (
                          <button className="secondary-button" disabled={equippingId === item.id || isEquipped(item)} onClick={() => handleEquip(item)} type="button">
                            {isEquipped(item) ? "Em uso" : item.category === "theme" ? "Usar tema" : "Equipar"}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ))}
    </PlatformShell>
  );
}
