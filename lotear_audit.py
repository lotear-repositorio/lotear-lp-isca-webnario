#!/usr/bin/env python3
"""
LOTEAR LP — Script de auditoria obrigatória
Roda ANTES e DEPOIS de qualquer commit no index.html
Uso: python3 lotear_audit.py <html_content_or_filepath>

Se passar um arquivo: python3 lotear_audit.py /tmp/index_new.html
Se passar via stdin: cat index.html | python3 lotear_audit.py -
"""

import sys, re

def audit(html: str) -> bool:
    results = []

    def check(label: str, condition: bool, critical: bool = True):
        results.append((label, condition, critical))

    # ── CONVERSÃO ──────────────────────────────────────────────────
    check('H1: O mapa certo para comprar Studios',   'O mapa certo' in html)
    check('form-sub: em instantes',                  'em instantes' in html)
    check('CTA: Baixar o guia agora',                'Baixar o guia agora' in html)
    check('wb-box bônus após botão',                 'Você também ganha uma vaga' in html)

    # ── SCROLL — 5 camadas (qualquer ausência = risco) ─────────────
    check('SCROLL-FIX comentário (proteção)',        'SCROLL-FIX' in html)
    check('html overflow-y:scroll',                  'overflow-y:scroll' in html)
    check('html,body height:100%',                   'height:100%' in html)
    check('body -webkit-overflow-scrolling:touch',   '-webkit-overflow-scrolling:touch' in html)
    check('overscroll-behavior-y:none (3×)',         html.count('overscroll-behavior-y:none') == 3)
    check('touchmove preventDefault JS',             'touchmove' in html and 'preventDefault' in html)

    # ── WA FLOAT ───────────────────────────────────────────────────
    check('WA-FLOAT comentário (proteção)',          'WA-FLOAT' in html)
    check('wa-float CSS base com position:fixed',    '.wa-float{' in html and 'position:fixed' in html)
    check('wa-float.visible CSS',                    '.wa-float.visible{opacity:1' in html)
    check('wa-float JS setTimeout classList',        "classList.add('visible')" in html)

    # ── TRACKING META ──────────────────────────────────────────────
    check('Meta Pixel ID 2152403845552453',          '2152403845552453' in html)
    check('eventIdLead separado',                    'eventIdLead' in html)
    check('eventIdCR separado',                      'eventIdCR' in html)
    check('ln condicional (sem string vazia)',        '...(lastName ?' in html)
    check('webinar_accept sempre Sim',               "webinar_accept: 'Sim'" in html)
    check('tag_data Funil de Webinar',               "tag_data: 'Funil de Webinar" in html)

    # ── INTEGRIDADE (elementos que NÃO devem existir) ──────────────
    check('sem modal-overlay',                       'modal-overlay' not in html)
    check('sem wcChecked',                           'wcChecked' not in html)
    check('sem acceptWebinar',                       'acceptWebinar' not in html)

    # ── FORMULÁRIO E ESTADOS ───────────────────────────────────────
    check('3 campos: fn, fw, fe',                   all(f'id="{x}"' in html for x in ['fn','fw','fe']))
    check('success-state id="success"',             'id="success"' in html)
    check('webinar-confirm-note no success',         'webinar-confirm-note' in html)

    # ── MÁSCARA DE TELEFONE ────────────────────────────────────────
    check('cursor preservado (setSelectionRange)',   'setSelectionRange' in html)
    check('digitsBeforeCursor na máscara',           'digitsBeforeCursor' in html)

    # ── RESULTADO ──────────────────────────────────────────────────
    ok_count  = sum(1 for _, ok, _ in results if ok)
    total     = len(results)
    all_ok    = all(ok for _, ok, _ in results)
    crit_fail = [label for label, ok, crit in results if not ok and crit]

    print(f"\n{'='*55}")
    print(f"  LOTEAR LP AUDIT — {ok_count}/{total} itens")
    print(f"{'='*55}")
    for label, ok, _ in results:
        print(f"  {'✅' if ok else '❌'} {label}")
    print(f"{'='*55}")
    if all_ok:
        print(f"  ✅ PASSOU — SEGURO PARA COMMIT")
    else:
        print(f"  ❌ FALHOU — NÃO COMMITAR")
        print(f"  Críticos com falha:")
        for f in crit_fail:
            print(f"    → {f}")
    print(f"{'='*55}\n")

    return all_ok

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] != '-':
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            html = f.read()
    else:
        html = sys.stdin.read()

    ok = audit(html)
    sys.exit(0 if ok else 1)
