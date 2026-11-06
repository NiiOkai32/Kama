(function(root){
  'use strict';
  class DuetClient{
    constructor({userId,api,subscribe,onState=()=>{},onError=()=>{},onConnection=()=>{},canPoll=()=>true,interval=12000}){
      Object.assign(this,{userId,api,subscribe,onState,onError,onConnection,canPoll,interval});
      this.room=null;this.offset=0;this.generation=0;this.poll=null;this.unsubscribe=null;this.busy=false;this.refreshing=false;this.connecting=false;this.connectionRequest=0;
    }
    apply(reply,generation=this.generation){
      if(generation!==this.generation||!reply?.room)return;
      const incoming=reply.room;
      if(incoming.host_id!==this.userId&&incoming.guest_id!==this.userId)return;
      if(this.room&&incoming.id!==this.room.id)return;
      if(this.room&&incoming.revision<this.room.revision)return;
      if(reply.server_now){const offset=Date.parse(reply.server_now)-Date.now();if(Number.isFinite(offset))this.offset=offset}
      const next={...incoming};
      if(this.room&&incoming.revision===this.room.revision){
        for(const key of ['host_seen_at','guest_seen_at'])if(Date.parse(this.room[key])>Date.parse(next[key]||0))next[key]=this.room[key];
      }
      this.room=next;this.onState(next,this.offset);
    }
    stop(){
      this.generation++;this.connectionRequest++;this.connecting=false;clearInterval(this.poll);this.poll=null;
      if(this.unsubscribe){try{this.unsubscribe()}catch{}}this.unsubscribe=null;this.room=null;this.refreshing=false;
    }
    attach(reply){
      this.stop();const generation=this.generation;
      if(!reply?.room){this.onState(null,this.offset);return reply}
      this.apply(reply,generation);
      if(!this.room)throw new Error('This room is unavailable.');
      this.onConnection('connecting');
      this.unsubscribe=this.subscribe(this.room.id,data=>this.apply({room:data},generation),status=>{if(generation===this.generation)this.onConnection(status)})||null;
      this.poll=setInterval(()=>{if(this.canPoll())this.refresh()},this.interval);
      return reply;
    }
    async connect(action,payload={}){
      if(this.connecting||this.busy)throw new Error('Wait for the previous action.');
      this.connecting=true;const request=++this.connectionRequest,generation=this.generation;
      try{
        const reply=await this.api({...payload,action});
        if(request!==this.connectionRequest||generation!==this.generation)return null;
        this.connecting=false;return this.attach(reply);
      }finally{if(request===this.connectionRequest)this.connecting=false}
    }
    async create(displayName){return this.connect('create',{display_name:displayName})}
    async join(code,displayName){return this.connect('join',{code,display_name:displayName})}
    async resume(){return this.connect('resume')}
    async refresh(){
      if(!this.room||this.refreshing)return;
      this.refreshing=true;const generation=this.generation;
      try{this.apply(await this.api({action:'status',room_id:this.room.id}),generation)}
      catch(error){if(generation===this.generation){this.onConnection('reconnecting');if(error.status===403||error.status===401){this.stop();this.onState(null,this.offset)}this.onError(error)}}
      finally{if(generation===this.generation)this.refreshing=false}
    }
    async command(action,payload={}){
      if(this.busy)throw new Error('Wait for the previous action.');
      if(!this.room)throw new Error('Join a room first.');
      this.busy=true;const generation=this.generation;
      try{
        const reply=await this.api({...payload,action,room_id:this.room.id,card_id:this.room.card_id,revision:this.room.revision});
        if(generation===this.generation){if(action==='leave'){this.stop();this.onState(null,this.offset)}else this.apply(reply,generation)}
        return reply;
      }catch(error){if(error.status===409)await this.refresh();throw error}
      finally{this.busy=false}
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={DuetClient};else root.KamaDuetClient={DuetClient};
})(globalThis);
