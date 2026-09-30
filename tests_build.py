"""Focused v2 contracts and deterministic replay regression checks."""
import copy
import os
os.environ.setdefault('TOUCHLINE_WORKERS','2')
import pytest
from fastapi.testclient import TestClient
import build
import server
import store
from tests_integration import start_req

@pytest.fixture
def client(tmp_path):
    store.init(tmp_path)
    server.ACTIVE_MATCHES.clear(); server.RECENT_FT.clear(); server._TIMELINES.clear()
    return TestClient(server.app)

def req(seed=711):
    r=start_req(seed=seed,minutes=3,mode="live")
    r['build']=dict(build.new_build('positional',tp={'wallet':40,'carried':0}),hand=['all_out_attack','see_it_out','time_waste'])
    return r

def test_catalog_and_training_are_real_and_pure(client):
    cat=client.get('/api/build/catalog').json()
    assert len(cat['systems'])==8 and len(cat['cards'])>=40
    r=req(); squad=list(r['home_team']['lineup'].values()); xi={s:p['id'] for s,p in r['home_team']['lineup'].items()}
    ev=client.post('/api/build/evaluate',json=dict(squad=squad,xi=xi,system_id='positional',build=r['build']))
    assert ev.status_code==200,ev.text
    assert len(ev.json()['fit_matrix'])==11
    body=dict(squad=squad,build=r['build'],plan=[dict(kind='attr',pid=squad[1]['id'],attr='cro',tp=2)])
    before=copy.deepcopy(body)
    a=client.post('/api/build/train',json=body); b=client.post('/api/build/train',json=dict(body,dry_run=True))
    assert a.status_code==200,a.text
    assert a.json()==b.json() and body==before
    assert a.json()['tp_spent']==2 and a.json()['squad_deltas']

def test_preparation_is_idempotent_and_set_pieces_copied():
    r=req(); r['build']['set_pieces']={'corner':r['home_team']['lineup']['LB']['id']}
    p=build.prepare_request(r)
    assert build.prepare_request(p)==p
    assert p['home_team']['set_pieces']==r['build']['set_pieces']
    assert '_build_prepared' not in r

def test_card_rewind_and_recovery(client):
    r=req(); r['build']['hand']=['time_waste']
    a=client.post('/api/matches/start',json=r)
    assert a.status_code==200,a.text
    mid=a.json()['match_id']
    path=f'/api/matches/{mid}'
    assert a.json()['cards']['HOME']['influence']==3
    bad=client.post(path+'/card',json={'card_id':'all_out_attack'})
    assert bad.status_code==400
    played=client.post(path+'/card',json={'card_id':'time_waste','request_id':'once'})
    assert played.status_code==200,played.text
    assert played.json()['applied'] and played.json()['cards']['HOME']['played']
    client.post(path+'/advance',json={'seconds':60,'frames':False})
    live=server.ACTIVE_MATCHES[mid]['engine']
    expected=[e.to_dict() for e in live.events]
    server.ACTIVE_MATCHES.clear()
    recovered=server._session(mid)['engine']
    assert [e.to_dict() for e in recovered.events]==expected
    assert build.card_state(recovered)==build.card_state(live)
    state=client.get(path+'/cards',params={'at':0}).json()
    assert state['played'][0]['card_id']=='time_waste'
    dup=client.post(path+'/card',json={'card_id':'time_waste','request_id':'once'})
    assert dup.json()['duplicate']

def test_preview_without_table_is_honest(client,monkeypatch):
    monkeypatch.setattr(build,'effect_table',lambda:None)
    r=client.post('/api/build/preview',json={'card_id':'time_waste','state':{'minute':20,'score_diff':0}})
    assert r.status_code==200 and r.json()['source']=='none' and r.json()['dpts'] is None

def test_analyst_budget_variants(client,monkeypatch):
    def futures(fn,jobs):
        return [dict(score={'HOME':1,'AWAY':0},xg={'HOME':1.2,'AWAY':.4},pillars={'possession':55},card_plays=[]) for _ in jobs]
    monkeypatch.setattr(server.labsim,'run_all',futures)
    r=req(); body=dict(start_request=r,build=r['build'],hand=['time_waste'],player_id='test-player',week='camp1')
    for left in (1,0):
        res=client.post('/api/analyst/test',json=body)
        assert res.status_code==200,res.text
        assert res.json()['runs_left']==left and res.json()['summary']['exp_points']==3
    assert client.post('/api/analyst/test',json=body).status_code==429
    body['week']='w1'
    assert client.post('/api/analyst/test',json=body).status_code==200

def test_ghost_one_ranked_run_and_disjoint_ids(client,monkeypatch):
    captured=[]
    def batch(request):
        captured.extend(request.requests)
        return {'results':[dict(match_id=f'fake{i}',full_time={'score':{'home':1,'away':0}}) for i in range(3)]}
    monkeypatch.setattr(server,'batch_matches',batch)
    r=req(); body=dict(player_id='ghost-test',manager_name='Manager',snapshot={'team':r['home_team'],'build':r['build']})
    a=client.post('/api/ghost/run',json=body)
    assert a.status_code==200,a.text
    assert a.json()['ranked'] and a.json()['stars']==3
    b=client.post('/api/ghost/run',json=body)
    assert b.json()['practice']
    assert client.get('/api/ghost/today',params={'player_id':'ghost-test'}).json()['ranked_used']
    assert client.get('/api/ghost/leaderboard').json()['total']==1
    home={p['id'] for p in captured[0]['home_team']['lineup'].values()}
    away={p['id'] for p in captured[0]['away_team']['lineup'].values()}
    assert not home & away

@pytest.mark.parametrize('cid',list(build.CARDS))
def test_every_card_compiles_and_applies(cid):
    r=req()
    r.pop('build')
    eng=build.build_engine(r)
    ids=[st.player.player_id for st in build._active(eng,'HOME')]
    parts=[dict(pattern=pattern,members=ids[:len(p['roles'])],fam=100,level=3) for pattern,p in build.PATTERNS.items()]
    build.install_runtime(eng,{'HOME':{'system_id':'positional','hand':[cid],'partnerships':parts}})
    before=[e.to_dict() for e in eng.events]
    compiled=build.compile_card(eng,'HOME',cid)
    assert [e.to_dict() for e in eng.events]==before
    out=build.apply_card(eng,build.card_command(cid,'HOME',force=True)['payload'])
    assert out['commands']==compiled['commands']
    assert eng.events[-1].event_type=='CARD_PLAYED'

def test_invalid_targets_do_not_mutate_live_state(client):
    r=req();r['build']['hand']=['fresh_legs']
    mid=client.post('/api/matches/start',json=r).json()['match_id']
    eng=server.ACTIVE_MATCHES[mid]['engine']; before=copy.deepcopy(build.card_state(eng)); events=len(eng.events)
    out=client.post(f'/api/matches/{mid}/card',json={'card_id':'fresh_legs','targets':{'player_off':'invalid'}})
    assert out.status_code==400
    assert build.card_state(eng)==before and len(eng.events)==events

def test_real_analyst_and_ghost_simulation(client,monkeypatch):
    r=req()
    out=client.post('/api/analyst/test',json={'start_request':r,'build':r['build'],'hand':['time_waste'],'player_id':'real-analyst','week':'w1'})
    assert out.status_code==200,out.text
    assert out.json()['n']==16 and out.json()['summary']['xg_for']>=0
    # Keep the real batch/worker/persistence path; shorten fixture duration only.
    original=server.batch_matches
    def short_batch(request):
        for rr in request.requests:
            rr['config']={'duration_seconds':180}
        return original(request)
    monkeypatch.setattr(server,'batch_matches',short_batch)
    ghost=client.post('/api/ghost/run',json={'player_id':'real-ghost','snapshot':{'team':r['home_team'],'build':r['build']}})
    assert ghost.status_code==200,ghost.text
    assert len(ghost.json()['results'])==3
    for result in ghost.json()['results']:
        row=store.get_match(result['match_id'])
        assert row['status']=='ft'

def test_kickoff_partnership_expiry_keeps_familiarity():
    r=req();lineup=r['home_team']['lineup'];members=[lineup['LB']['id'],lineup['LW']['id']]
    r['build']['partnerships']=[dict(pattern='overlap',members=members,fam=100)]
    r['build']['familiarity']={'positional':100}
    prepared=build.prepare_request(r)
    assert prepared['home_team']['lineup']==r['home_team']['lineup']
    engine=build.build_engine(prepared)
    mate=engine.states[members[1]]
    assert mate.mods.get('vision',0)>0
    build.management.APPLIERS['substitution'](engine,{'team':'HOME','player_off':members[0], 'player_on':'liv_gen_cb_02','target_slot':'LB'})
    assert mate.mods.get('vision',0)==0
    assert mate.mods.get('reactions',0)>0

def test_timed_card_revert_replays_exactly(client):
    r=req();r['config']['duration_seconds']=1200;r['build']['hand']=['time_waste']
    mid=client.post('/api/matches/start',json=r).json()['match_id']
    out=client.post(f'/api/matches/{mid}/card',json={'card_id':'time_waste'})
    assert out.status_code==200,out.text
    end=out.json()['scheduled'][0]['clock']+1
    s=server.ACTIVE_MATCHES[mid];server._advance_plain(s,end)
    expected=[e.to_dict() for e in s['engine'].events]
    assert any(e['event_type']=='CARD_EXPIRED' for e in expected)
    replay=server._replay_native(s['request'],s['commands'],end)[0]
    assert [e.to_dict() for e in replay.events]==expected

def test_ghost_failed_first_run_stays_used(client,monkeypatch):
    r=req();body={'player_id':'failed-ghost','snapshot':{'team':r['home_team'],'build':r['build']}}
    def fail(req): raise RuntimeError('simulation interrupted')
    monkeypatch.setattr(server,'batch_matches',fail)
    assert client.post('/api/ghost/run',json=body).status_code==500
    assert client.get('/api/ghost/today',params={'player_id':'failed-ghost'}).json()['ranked_used']

def test_real_build_review_and_cpu_round(client):
    r=req();r['mode']='full'
    out=client.post('/api/matches/start',json=r)
    assert out.status_code==200,out.text
    mid=out.json()['match_id']
    review=client.get(f'/api/matches/{mid}/review')
    assert review.status_code==200,review.text
    assert review.json()['system_report']['pillars'] and review.json()['player_grades']
    rr=req(812);rr.pop('build');rr['builds']={'HOME':{'system_id':'positional','familiarity':{'positional':100}},'AWAY':{'system_id':'gegenpress'}}
    res=client.post('/api/matchweek/round',json={'requests':[rr]})
    assert res.status_code==200,res.text
    record=store.get_match(res.json()['results'][0]['match_id'])
    import json
    saved=json.loads(record['start_request_json'])
    assert saved['builds']['HOME']['control']=='cpu'
    assert saved['_build_prepared']
    assert saved['modifiers']

def test_live_system_pillars_use_presented_clock(client):
    r=req();r['config']['duration_seconds']=3600
    mid=client.post('/api/matches/start',json=r).json()['match_id']
    res=client.get(f'/api/matches/{mid}/insights',params={'at':0})
    assert res.status_code==200,res.text
    assert res.json()['clock']==0 and res.json()['system_report']['pillars']
    assert all(p['value']==0 or p['metric']=='possession' for p in res.json()['system_report']['pillars'])

def test_real_stress_test_consumes_camp_budget_and_preserves_input(client):
    r=req(); body={'mode':'stress','start_request':r,'build':r['build'],'hand':['time_waste'],
                   'player_id':'stress-player','week':'camp1','variants':[{'label':'same'}]}
    before=copy.deepcopy(body)
    res=client.post('/api/analyst/test',json=body)
    assert res.status_code==200,res.text
    out=res.json()
    assert out['mode']=='stress' and out['matches']==48 and len(out['weeks'])==3
    assert out['runs_left']==0 and out['runs_used']==2
    assert out['summary']==out['variants'][0]['summary']
    assert body==before
    assert client.post('/api/analyst/test',json=body).status_code==429

def test_manual_change_labels_and_card_labels_are_exact():
    import coach
    prev=coach._engine_tactics({'buildUpTempo':'Balanced','pressingIntensity':'Selective'})
    cmd={'kind':'tactics','payload':{'team':'HOME','tactics':{'buildUpTempo':'Quick','pressingIntensity':'Aggressive'}}}
    label,detail=coach.describe_command_full(cmd,{},prev)
    assert 'Pressing Intensity Aggressive' in label
    assert 'men forward' not in label and 'Box Commitment' not in detail
    card=build.card_command('time_waste','HOME')
    label,detail=coach.describe_command_full(card,{},prev)
    assert label==build.CARDS['time_waste']['name'] and detail

def test_card_level_calibration_and_custom_deck_minimum(monkeypatch):
    model={'dpts':{'coef':{'const':.2,'system_pair:positional|gegenpress':.3}}}
    table={'calibrated':False,'cards':{'time_waste':{'calibrated':True,'model':model}}}
    monkeypatch.setattr(build,'effect_table',lambda:table)
    assert build.table_preview('time_waste',{'own_system':'positional','opp_system':'gegenpress'})['dpts']==.5
    table['calibrated']=True;table['cards']['time_waste']['calibrated']=False
    assert build.table_preview('time_waste',{}) is None
    assert build.minimum_deck_size({'system_id':'custom'})==9

def test_cpu_system_bundle_default_override_and_policy_freeze(monkeypatch):
    r=req();r.pop('build');r['cpu_build']={'system_id':'low_block','hand':['time_waste','tactical_foul']}
    table={'cards':{'time_waste':{'calibrated':True,'model':{'dpts':{'coef':{'const':10}}}},
                    'tactical_foul':{'calibrated':True,'model':{'dpts':{'coef':{'const':-10}}}}}}
    monkeypatch.setattr(build,'effect_table',lambda:table)
    prepared=build.prepare_request(r)
    side=prepared['away_team'];system=build.SYSTEMS['low_block']
    assert side['formation']==system['formation'] and side['tactics']==system['tactics']
    assert len(side['player_instructions'])==11
    engine=build.build_engine(prepared)
    chosen=build.ai_choose_card(engine,'AWAY',peek=True)
    assert chosen=='time_waste'
    table['cards']['time_waste']['model']['dpts']['coef']['const']=-20
    table['cards']['tactical_foul']['model']['dpts']['coef']['const']=20
    assert build.ai_choose_card(build.build_engine(prepared),'AWAY',peek=True)==chosen
    r['cpu_build']['apply_system']=False
    alternate=build.prepare_request(r)
    assert alternate['away_team']['formation']==r['away_team']['formation']
    assert alternate['away_team']['tactics']==r['away_team']['tactics']

def test_penalty_xg_reporting_is_inclusive_and_idempotent():
    events=[{'event_type':'PENALTY','team_id':'AWAY','detail':{'p_goal':.85}}]
    stats=server.bridge.reported_team_stats({'xg':7.237},events,'AWAY')
    assert stats['xg']==8.087 and stats['non_penalty_xg']==7.237
    assert server.bridge.reported_team_stats(stats,events,'AWAY')==stats
